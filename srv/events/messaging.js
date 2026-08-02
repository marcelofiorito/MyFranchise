'use strict';
/**
 * srv/events/messaging.js
 *
 * Emite e consome eventos via SAP Event Mesh (enterprise-messaging-shared).
 * Tópicos publicados pelo RunMyFranchise:
 *   myfranchise/runmyfranchise/v1/Estoque/Changed
 *   myfranchise/runmyfranchise/v1/Pedido/StatusChanged
 *   myfranchise/runmyfranchise/v1/Desvio/Detectado
 *
 * Handlers autônomos:
 *   - Estoque/Changed → verifica cobertura → gera pedido se ruptura
 *   - Pedido/StatusChanged → log / trigger SBPA (fase 2)
 *   - Desvio/Detectado → recalcula score da loja
 */

const cds = require('@sap/cds');
const reposicao = require('../ai/reposicao-agent');

// ─── Tópicos ────────────────────────────────────────────────
const TOPIC_ESTOQUE   = 'myfranchise/runmyfranchise/v1/Estoque/Changed';
const TOPIC_PEDIDO    = 'myfranchise/runmyfranchise/v1/Pedido/StatusChanged';
const TOPIC_DESVIO    = 'myfranchise/runmyfranchise/v1/Desvio/Detectado';

module.exports = async (srv) => {

  let messaging;
  try {
    messaging = await cds.connect.to('messaging');
  } catch (e) {
    cds.log('messaging').warn('Event Mesh não configurado — modo autônomo desativado:', e.message);
    return;
  }

  // ─── EMISSÃO: helpers exportados para uso nos handlers do service ────

  srv.emitEstoqueChanged = async (item) => {
    await messaging.emit(TOPIC_ESTOQUE, {
      ID          : item.ID,
      unidade_ID  : item.unidade_ID,
      sku         : item.sku,
      saldoAtual  : item.saldoAtual,
      status_code : item.status_code,
      timestamp   : new Date().toISOString()
    });
  };

  srv.emitPedidoStatusChanged = async (pedido) => {
    await messaging.emit(TOPIC_PEDIDO, {
      ID          : pedido.ID,
      unidade_ID  : pedido.unidade_ID,
      sku         : pedido.sku,
      status_code : pedido.status_code,
      timestamp   : new Date().toISOString()
    });
  };

  srv.emitDesvioDetectado = async (desvio) => {
    await messaging.emit(TOPIC_DESVIO, {
      ID          : desvio.ID,
      unidade_ID  : desvio.unidade_ID,
      sku         : desvio.sku,
      severidade  : desvio.severidade_code,
      timestamp   : new Date().toISOString()
    });
  };

  // ─── CONSUMO: handlers autônomos ────────────────────────────────────

  // Evento: estoque modificado → verifica se há ruptura e dispara agente
  messaging.on(TOPIC_ESTOQUE, async (msg) => {
    const { unidade_ID, sku, saldoAtual, status_code } = msg.data;
    cds.log('messaging').info(`[AUTO] Estoque changed: ${unidade_ID} / ${sku} → ${status_code} (saldo: ${saldoAtual})`);

    // Só aciona o agente se o item entrou em risco (criticality 1 ou 2)
    if (status_code === 'RUPTURA' || status_code === 'ATENCAO') {
      cds.log('messaging').info(`[AUTO] Ruptura detectada — acionando Agente de Reposição para ${unidade_ID}`);
      try {
        // Verifica se já existe pedido PENDENTE para evitar duplicatas
        const { Pedidos_Reposicao } = srv.entities;
        const existing = await SELECT.one.from(Pedidos_Reposicao)
          .where({ unidade_ID, sku, status_code: 'PENDENTE' });

        if (!existing) {
          const result = await reposicao.gerarParaUnidade(srv, unidade_ID);
          cds.log('messaging').info(`[AUTO] Agente gerou ${result.count} pedidos para ${unidade_ID} (modo: ${result.modo})`);
        } else {
          cds.log('messaging').info(`[AUTO] Já existe pedido PENDENTE para ${unidade_ID}/${sku} — agente não acionado`);
        }
      } catch (e) {
        cds.log('messaging').error(`[AUTO] Erro no agente de reposição:`, e.message);
      }
    }
  });

  // Evento: pedido de status mudou → log (fase 2: trigger SBPA)
  messaging.on(TOPIC_PEDIDO, async (msg) => {
    const { ID, unidade_ID, status_code } = msg.data;
    cds.log('messaging').info(`[AUTO] Pedido ${ID} (${unidade_ID}) → ${status_code}`);
    // Fase 2: se status_code === 'APROVADO' → disparar SBPA workflow
  });

  // Evento: desvio detectado → recalcula score da loja
  messaging.on(TOPIC_DESVIO, async (msg) => {
    const { unidade_ID, severidade } = msg.data;
    cds.log('messaging').info(`[AUTO] Desvio ${severidade} detectado em ${unidade_ID} — score será recalculado`);
    // O score é recalculado no próximo READ ou pode ser forçado aqui
    // via _recalcularSaude se necessário
  });

  cds.log('messaging').info('✅ Event Mesh conectado — modo autônomo ativado (3 tópicos)');
};
