'use strict';
/**
 * srv/events/messaging.js
 *
 * Emite e consome eventos via SAP Advanced Event Mesh.
 * Tópicos:
 *   myfranchise/runmyfranchise/v1/Estoque/Changed
 *   myfranchise/runmyfranchise/v1/Pedido/StatusChanged
 *   myfranchise/runmyfranchise/v1/Desvio/Detectado
 *
 * Agentes autônomos:
 *   - Estoque/Changed (RUPTURA|ATENCAO) → cria pedidos de reposição via AI
 *   - Estoque/Changed (OK)             → loga resolução da ruptura
 *   - Pedido/StatusChanged (APROVADO)  → atualiza estoque + marca RECEBIDO
 *   - Desvio/Detectado                 → recalcula score da loja
 */

const cds = require('@sap/cds');
const reposicao = require('../ai/reposicao-agent');
const LOG = cds.log('messaging');

const TOPIC_ESTOQUE = 'myfranchise/runmyfranchise/v1/Estoque/Changed';
const TOPIC_PEDIDO  = 'myfranchise/runmyfranchise/v1/Pedido/StatusChanged';
const TOPIC_DESVIO  = 'myfranchise/runmyfranchise/v1/Desvio/Detectado';

module.exports = async (srv) => {

  let messaging;
  try {
    messaging = await cds.connect.to('messaging');
  } catch (e) {
    LOG.warn('Event Mesh não configurado — modo autônomo desativado:', e.message);
    return;
  }

  // ─── EMISSÃO ─────────────────────────────────────────────────────────

  srv.emitEstoqueChanged = async (item) => {
    await messaging.emit(TOPIC_ESTOQUE, {
      ID: item.ID, unidade_ID: item.unidade_ID, sku: item.sku,
      saldoAtual: item.saldoAtual, status_code: item.status_code,
      timestamp: new Date().toISOString()
    });
  };

  srv.emitPedidoStatusChanged = async (pedido) => {
    await messaging.emit(TOPIC_PEDIDO, {
      ID: pedido.ID, unidade_ID: pedido.unidade_ID, sku: pedido.sku,
      qtdAprovada: pedido.qtdAprovada, status_code: pedido.status_code,
      timestamp: new Date().toISOString()
    });
  };

  srv.emitDesvioDetectado = async (desvio) => {
    await messaging.emit(TOPIC_DESVIO, {
      ID: desvio.ID, unidade_ID: desvio.unidade_ID, sku: desvio.sku,
      severidade: desvio.severidade_code, timestamp: new Date().toISOString()
    });
  };

  // ─── CONSUMO ─────────────────────────────────────────────────────────

  // Estoque/Changed → cria pedidos se ruptura, loga se normalizado
  messaging.on(TOPIC_ESTOQUE, async (msg) => {
    const { unidade_ID, sku, saldoAtual, status_code } = msg.data;
    LOG.info(`[AUTO] Estoque: ${unidade_ID}/${sku} → ${status_code} (saldo: ${saldoAtual})`);

    if (status_code === 'RUPTURA' || status_code === 'ATENCAO') {
      LOG.info(`[AUTO] Ruptura detectada em ${unidade_ID} — acionando Agente de Reposição`);
      try {
        const { Pedidos_Reposicao } = srv.entities;
        const existing = await SELECT.one.from(Pedidos_Reposicao)
          .where({ unidade_ID, sku, status_code: 'PENDENTE' });
        if (!existing) {
          const result = await reposicao.gerarParaUnidade(srv, unidade_ID);
          LOG.info(`[AUTO] Agente gerou ${result.count} pedido(s) para ${unidade_ID} (${result.modo})`);
        } else {
          LOG.info(`[AUTO] Pedido PENDENTE já existe para ${unidade_ID}/${sku} — agente não acionado`);
        }
      } catch (e) {
        LOG.error(`[AUTO] Erro no agente de reposição:`, e.message);
      }
    } else if (status_code === 'OK') {
      LOG.info(`[AUTO] ✅ Ruptura resolvida em ${unidade_ID}/${sku} — estoque normalizado`);
    }
  });

  // Pedido/StatusChanged → log (recebimento é acionado manualmente via simularRecebimento)
  messaging.on(TOPIC_PEDIDO, async (msg) => {
    const { ID, unidade_ID, sku, status_code } = msg.data;
    LOG.info(`[AUTO] Pedido ${ID} (${unidade_ID}/${sku}) → ${status_code}`);
  });

  // Desvio/Detectado → recalcula score
  messaging.on(TOPIC_DESVIO, async (msg) => {
    const { unidade_ID, severidade } = msg.data;
    LOG.info(`[AUTO] Desvio ${severidade} em ${unidade_ID} — score será recalculado`);
  });

  LOG.info('✅ Event Mesh conectado — modo autônomo ativado (3 tópicos)');

  // ─── STARTUP: varre rupturas existentes e emite eventos ──────────────
  // Delay para garantir que o consumer AEM já está conectado
  setTimeout(async () => {
    try {
      const { Estoque_Unidade } = srv.entities;
      const rupturas = await SELECT.from(Estoque_Unidade)
        .where({ status_code: { in: ['RUPTURA', 'ATENCAO'] } });

      if (!rupturas.length) {
        LOG.info('[AUTO] Startup: nenhum item em ruptura/atenção');
        return;
      }

      LOG.info(`[AUTO] Startup: ${rupturas.length} item(s) em risco — emitindo eventos para o broker`);
      for (const item of rupturas) {
        await srv.emitEstoqueChanged(item).catch(e =>
          LOG.warn(`[AUTO] Startup emit falhou para ${item.unidade_ID}/${item.sku}:`, e.message)
        );
      }
    } catch (e) {
      LOG.error('[AUTO] Startup scan falhou:', e.message);
    }
  }, 5000); // 5s após conectar — garante consumer AEM ativo
};
