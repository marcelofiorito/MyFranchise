'use strict';
/**
 * srv/aem-patched.js
 *
 * Subclasse do @cap-js/advanced-event-mesh que torna o init() não-bloqueante.
 * O servidor HTTP sobe imediatamente; o AEM conecta em background.
 * Os emits ficam em fila local até o AEM estar pronto.
 */
const cds = require('@sap/cds')

let AdvancedEventMesh
try {
  AdvancedEventMesh = require('@cap-js/advanced-event-mesh')
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
      const TIMEOUT_MS = 90000 // 90s timeout

      let timeoutHandle
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() =>
          reject(new Error('AEM init timeout after 90s')), TIMEOUT_MS
        )
      })

      const _flush = (label) => {
        if (this._aemReady) return // já foi feito
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
          cds.log('messaging').warn(`[AEM] Stack: ${e.stack?.split('\n')[1]}`)
          _flush('AEM init failed — forcing ready')
        })

      // Race com timeout — se o init demorar mais que 90s, força ready
      timeoutPromise.catch(e => {
        _flush(`AEM timeout — forcing ready`)
      })

      // Retorna imediatamente
    }

    async emit(topic, data) {
      if (this._aemReady) {
        cds.log('messaging').info(`[AEM] Emitting to broker: ${topic}`)
        return super.emit(topic, data)
      }
      // AEM ainda não está pronto — guarda na fila local
      cds.log('messaging').info(`[AEM] Queuing emit (not ready yet): ${topic} — queue size: ${this._pendingEmits.length + 1}`)
      this._pendingEmits.push({ topic, data })
    }
  }
}
