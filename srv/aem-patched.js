'use strict';
const cds = require('@sap/cds')

let AdvancedEventMesh, solace
try {
  AdvancedEventMesh = require('@cap-js/advanced-event-mesh')
  solace = require('solclientjs')
} catch (e) {
  cds.log('messaging').warn('AEM plugin not found:', e.message)
}

if (!AdvancedEventMesh) {
  module.exports = cds.MessagingService
} else {
  module.exports = class PatchedAEM extends AdvancedEventMesh {

    constructor(...args) {
      super(...args)
      this._aemReady = false
      this._pendingEmits = []
    }

    async init() {
      const LOG = cds.log('messaging')
      const TIMEOUT_MS = 180000
      const BASIC_USER    = this.options.credentials?.basic_user    || process.env.AEM_BASIC_USER    || 'solace-cloud-client'
      const BASIC_PASS    = this.options.credentials?.basic_pass    || process.env.AEM_BASIC_PASS
      const CONSUMER_USER = this.options.credentials?.consumer_user || process.env.AEM_CONSUMER_USER || BASIC_USER
      const CONSUMER_PASS = this.options.credentials?.consumer_pass || process.env.AEM_CONSUMER_PASS || BASIC_PASS

      // Intercepta createSession para trocar OAuth por Basic Auth.
      // Developer 100 só aceita Basic Auth no SMF WebSocket.
      if (!BASIC_PASS) {
        LOG.warn('[AEM] basic_pass não encontrado — usando OAuth (pode falhar no Developer 100)')
      } else {
        const origCreate = solace.SolclientFactory.createSession.bind(solace.SolclientFactory)
        solace.SolclientFactory.createSession = (opts) => {
          solace.SolclientFactory.createSession = origCreate
          LOG.info('[AEM] createSession patched: OAuth → Basic Auth')
          return origCreate({
            ...opts,
            userName: BASIC_USER,
            password: BASIC_PASS,
            accessToken: undefined,
            authenticationScheme: undefined
          })
        }
      }

      const _flush = (label) => {
        if (this._aemReady) return
        this._aemReady = true
        const pending = this._pendingEmits.splice(0)
        LOG.info(`[AEM] ${label} — flushing ${pending.length} pending emits`)
        for (const { topic, data } of pending) {
          super.emit(topic, data).catch(e2 =>
            LOG.warn(`[AEM] Pending emit failed: ${e2.message}`)
          )
        }
      }

      let timeoutHandle
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() =>
          reject(new Error('AEM init timeout')), TIMEOUT_MS
        )
      })

      const t0 = Date.now()
      super.init()
        .then(() => {
          clearTimeout(timeoutHandle)
          LOG.info(`[AEM] Connected in ${((Date.now()-t0)/1000).toFixed(1)}s`)
          _flush('✅ AEM ready (Basic Auth) — publish ativo')

          // Sessão separada para consume — mesmos params mínimos do teste standalone
          // (a sessão do plugin tem propriedades extras que causam subcode 114 no bind)
          const creds = this.options.credentials
          const smfUri = creds?.endpoints?.['advanced-event-mesh']?.smf_uri
          const vpn    = creds?.vpn
          const queue  = this.options.credentials?.consumer_queue
            || this.options?.queue?.name
            || 'myfranchise-consumer'

          if (!smfUri || !vpn) {
            LOG.warn('[AEM] Parâmetros insuficientes para consumer session')
            return
          }

          // Usa sempre Basic Auth para consumer — OAuth2 não funciona no SMF WebSocket do Developer 100
          const consumerSessionProps = { url: smfUri, vpnName: vpn, userName: CONSUMER_USER, password: CONSUMER_PASS }
          LOG.info('[AEM] Consumer session auth: Basic Auth, fila:', queue)

          try {
            const consumerSession = solace.SolclientFactory.createSession({
              ...consumerSessionProps,
              connectTimeoutInMsecs: 10000, reconnectRetries: 3,
              reconnectRetryWaitInMsecs: 3000
            })

            consumerSession.on(solace.SessionEventCode.UP_NOTICE, () => {
              LOG.info('[AEM] Consumer session UP — conectando à fila: ' + queue)
              const consumer = consumerSession.createMessageConsumer({
                queueDescriptor: { name: queue, type: solace.QueueType.QUEUE },
                acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT,
                reconnectAttempts: 3
              })
              consumer.on(solace.MessageConsumerEventName.UP, () => {
                LOG.info('[AEM] ✅ Consumer conectado — escutando fila: ' + queue)
              })
              consumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, ev => {
                LOG.warn('[AEM] Consumer CONNECT_FAILED subcode:', ev?.subcode, ev?.infoStr)
              })
              consumer.on(solace.MessageConsumerEventName.DOWN_ERROR, ev => {
                LOG.warn('[AEM] Consumer DOWN_ERROR — tentando reconectar...', ev?.infoStr)
              })
              consumer.on(solace.MessageConsumerEventName.MESSAGE, async (solaceMsg) => {
                const event = solaceMsg.getDestination().getName()
                LOG.info('[AEM] Received:', event)
                try {
                  const raw = solaceMsg.getBinaryAttachment()?.toString?.() || ''
                  const parsed = JSON.parse(raw)
                  const data    = parsed.data !== undefined ? parsed.data : parsed
                  const headers = parsed.data !== undefined
                    ? Object.fromEntries(Object.entries(parsed).filter(([k]) => k !== 'data'))
                    : {}
                  await this.tx({ user: cds.User.privileged }, tx => tx.emit({ event, data, headers }))
                  solaceMsg.acknowledge()
                } catch (e) {
                  LOG.error('[AEM] Erro ao processar mensagem:', e.message)
                  solaceMsg.acknowledge()
                }
              })
              consumer.connect()
            })

            consumerSession.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, ev => {
              LOG.warn('[AEM] Consumer session FAILED:', ev?.infoStr)
            })
            consumerSession.on(solace.SessionEventCode.DISCONNECTED, () => {
              LOG.warn('[AEM] Consumer session desconectada')
            })

            consumerSession.connect()
          } catch (e) {
            LOG.warn('[AEM] Erro ao criar consumer session:', e.message)
          }
        })
        .catch(err => {
          clearTimeout(timeoutHandle)
          LOG.warn(`[AEM] init failed: ${err.message}`)
          _flush('AEM failed — eventos processados localmente')
        })

      timeoutPromise.catch(() => _flush('AEM timeout — forcing ready'))
    }

    async emit(topic, data) {
      if (this._aemReady) {
        cds.log('messaging').info(`[AEM] Emitting: ${topic}`)
        return super.emit(topic, data)
      }
      cds.log('messaging').info(`[AEM] Queued: ${topic} (${this._pendingEmits.length + 1} pending)`)
      this._pendingEmits.push({ topic, data })
    }
  }
}
