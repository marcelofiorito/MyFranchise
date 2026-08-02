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
      const BASIC_USER = this.options.credentials?.basic_user
        || process.env.AEM_BASIC_USER
        || 'solace-cloud-client'
      const BASIC_PASS = this.options.credentials?.basic_pass
        || process.env.AEM_BASIC_PASS

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
      // Roda super.init() em background — servidor HTTP sobe imediatamente.
      // Consumer (receive) não é ativado: no plano Developer 100, o consumer
      // via SMF/Basic Auth retorna subcode 114 (CLIENT_BIND_MISSING_SUBSCRIPTION).
      // O consumer futuro será SAP BPA + Integration Suite via iFlow.
      // Os handlers autônomos (messaging.on) operam localmente no mesmo processo.
      super.init()
        .then(() => {
          clearTimeout(timeoutHandle)
          LOG.info(`[AEM] Connected in ${((Date.now()-t0)/1000).toFixed(1)}s`)
          _flush('✅ AEM ready (Basic Auth) — publish ativo, consumer via BPA/IS')
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
