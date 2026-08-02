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
      // Credenciais basic auth: lidas do user-provided service (basic_user/basic_pass),
      // com fallback para env vars (AEM_BASIC_USER/AEM_BASIC_PASS)
      const BASIC_USER = this.options.credentials?.basic_user
        || process.env.AEM_BASIC_USER
        || 'solace-cloud-client'
      const BASIC_PASS = this.options.credentials?.basic_pass
        || process.env.AEM_BASIC_PASS

      // Intercepta createSession para trocar OAuth por Basic Auth.
      // O plugin busca um token IAS (necessário para _validateBroker e SEMP),
      // mas o broker SMF WebSocket só aceita Basic Auth neste plano Developer 100.
      if (!BASIC_PASS) {
        LOG.warn('[AEM] basic_pass not found in credentials or env — using OAuth (may fail on Developer 100)')
      } else {
        const origCreate = solace.SolclientFactory.createSession.bind(solace.SolclientFactory)
        solace.SolclientFactory.createSession = (opts) => {
          solace.SolclientFactory.createSession = origCreate  // restaura imediatamente
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
      // super.init() é não-bloqueante — servidor HTTP sobe normalmente.
      // Race condition: cds.once('listening') no plugin é registrado DENTRO de super.init(),
      // mas o evento 'listening' já disparou antes disso. Chamamos startListening() manualmente.
      super.init()
        .then(() => {
          clearTimeout(timeoutHandle)
          LOG.info(`[AEM] Connected in ${((Date.now()-t0)/1000).toFixed(1)}s`)
          _flush('✅ AEM ready (Basic Auth)')
          // Consumer nunca subiu via cds.once('listening') — aciona diretamente.
          // Solace SDK exige QueueType enum, não string — converte antes de chamar.
          if (this.options?.consumer?.queueDescriptor?.type === 'Queue') {
            this.options.consumer.queueDescriptor.type = solace.QueueType.QUEUE
          }
          if (typeof this.startListening === 'function') {
            this.startListening()
              .then(() => LOG.info('[AEM] ✅ Consumer connected — escutando fila'))
              .catch(e => LOG.warn('[AEM] startListening failed:', e.message))
          }
        })
        .catch(err => {
          clearTimeout(timeoutHandle)
          LOG.warn(`[AEM] init failed: ${err.message} — falling back to file-based`)
          _flush('AEM failed — events lost (file-based fallback active)')
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
