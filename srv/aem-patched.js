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
      const TIMEOUT_MS = 90000

      // Inicializa o SolclientFactory imediatamente — não espera super.init()
      // para que os emits não falhem com "SolclientFactory not initialized"
      try {
        solace.SolclientFactory.init(new solace.SolclientFactoryProperties({
          logLevel: 5,
          profile: solace.SolclientFactoryProfiles.version10
        }))
        cds.log('messaging').info('[AEM] SolclientFactory pre-initialized')
      } catch(e) {
        // Já inicializado — ok
      }

      let timeoutHandle
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() =>
          reject(new Error('AEM init timeout after 90s')), TIMEOUT_MS
        )
      })

      const _flush = (label) => {
        if (this._aemReady) return
        this._aemReady = true
        const pending = this._pendingEmits.splice(0)
        cds.log('messaging').info(`[AEM] ${label} — flushing ${pending.length} pending emits`)
        for (const { topic, data } of pending) {
          super.emit(topic, data).catch(e =>
            cds.log('messaging').warn('[AEM] Pending emit failed:', e.message)
          )
        }
      }

      super.init()
        .then(() => {
          clearTimeout(timeoutHandle)
          cds.log('messaging').info('[AEM] super.init() completed successfully')
          _flush('✅ AEM connected')
        })
        .catch(e => {
          clearTimeout(timeoutHandle)
          cds.log('messaging').warn(`[AEM] super.init() FAILED: ${e.message}`)
          _flush('AEM init failed — forcing ready')
        })

      timeoutPromise.catch(() => {
        _flush('AEM timeout — forcing ready')
      })
    }

    async emit(topic, data) {
      if (this._aemReady) {
        cds.log('messaging').info(`[AEM] Emitting to broker: ${topic}`)
        return super.emit(topic, data)
      }
      cds.log('messaging').info(`[AEM] Queuing emit (not ready yet): ${topic} — queue size: ${this._pendingEmits.length + 1}`)
      this._pendingEmits.push({ topic, data })
    }
  }
}

