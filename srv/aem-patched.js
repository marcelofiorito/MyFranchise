'use strict';
/**
 * srv/aem-patched.js
 *
 * Subclasse do @cap-js/advanced-event-mesh que torna o init() não-bloqueante.
 * O _validateBroker() e session.connect() são executados de forma assíncrona
 * para não bloquear o startup do servidor HTTP em Cloud Foundry.
 */
const cds = require('@sap/cds')

let AdvancedEventMesh
try {
  AdvancedEventMesh = require('@cap-js/advanced-event-mesh')
} catch (e) {
  // Plugin não instalado — fallback silencioso
  cds.log('messaging').warn('AEM plugin not found:', e.message)
}

if (!AdvancedEventMesh) {
  module.exports = cds.MessagingService
} else {
  module.exports = class PatchedAEM extends AdvancedEventMesh {
    async init() {
      // Inicia a inicialização do AEM de forma não-bloqueante
      // para não bloquear o startup do servidor HTTP no CF
      super.init().then(() => {
        cds.log('messaging').info('✅ AEM connected — autonomous mode active')
      }).catch(e => {
        cds.log('messaging').warn('AEM init deferred/failed:', e.message)
      })
      // Não aguarda — retorna imediatamente para o CAP continuar o startup
    }
  }
}
