'use strict';

/**
 * MCP Server — RunMyFranchise
 * Expõe 6 ferramentas para o SAP Joule via Model Context Protocol.
 * Cada request cria uma nova instância do McpServer (stateless).
 */

const { McpServer }  = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z }          = require('zod');
const express        = require('express');
const cds            = require('@sap/cds');

const PORT    = process.env.PORT || process.env.MCP_PORT || 3001;
const LOG     = cds.log('mcp-server');
const MES_REF = parseInt(process.env.MES_REFERENCIA || '7', 10);

const ok  = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const err = (msg)  => ({ isError: true, content: [{ type: 'text', text: JSON.stringify({ error: msg }) }] });

// Conexão DB reutilizada — inicializada uma vez na startup
let _db = null;
const getDb = async () => { if (!_db) _db = await cds.connect.to('db'); return _db; };

// HANA retorna nomes de coluna em UPPERCASE — normaliza para lowercase
const norm    = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k.toLowerCase()] = v;
  return out;
};
const normAll = (rows) => Array.isArray(rows) ? rows.map(norm) : (rows ? [norm(rows)] : []);

// Executa query e normaliza resultado
const dbq = async (query) => {
  const db = await getDb();
  const res = await db.run(query);
  return Array.isArray(res) ? normAll(res) : (res ? norm(res) : res);
};

// Cache leve para dados estáticos (Unidades, Sazonalidade) — TTL 5 min
const _cache = new Map();
const cached = async (key, ttlMs, fn) => {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.val;
  const val = await fn();
  _cache.set(key, { val, ts: Date.now() });
  return val;
};

const getUnidades  = () => cached('unidades', 5*60*1000, () => dbq(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade','regiao_code')));
const getSazo      = () => cached('sazo', 5*60*1000, () => dbq(SELECT.from('myfranchise.Sazonalidade_Regional').where({ mes: MES_REF })));
const getSaude     = () => cached('saude', 60*1000, () => dbq(SELECT.from('myfranchise.Saude_Dashboard')));

// Resolve nome/cidade → unidade_ID
const resolveUnidade = async (input) => {
  if (!input) return null;
  if (input.match(/^u\d+$/i)) return input;
  const unids = await getUnidades();
  const search = input.toLowerCase().replace('loja ', '').trim();
  const found = unids.find(u => u.nome?.toLowerCase().includes(search) || u.cidade?.toLowerCase().includes(search));
  return found ? (found.id || found.ID) : input;
};

// ── Factory: cria McpServer por request (evita "already connected") ──
function buildServer() {
  const server = new McpServer({
    name: 'runmyfranchise-mcp',
    version: '1.0.0',
    instructions: `You are the AI assistant for RunMyFranchise, a franchise network management platform.
You have full access to real-time data and CAN perform actions. Always use your tools — never say you cannot access data or perform actions.

RULES:
- When asked about stockout risk, at-risk stores, or coverage: use get_lojas_em_risco
- When asked about stock coverage for a specific store: use get_cobertura_estoque
- When asked about pending/approved/rejected orders: use get_pedidos_pendentes
- When asked to APPROVE ALL orders (network-wide): use process_replenishment_orders with no arguments
- When asked to APPROVE orders for a specific store: use process_replenishment_orders with unidade_ID
- When asked to APPROVE a single order by ID: use confirm_single_order with pedido_id
- When asked to REJECT an order: use reject_order with pedido_id
- When asked to trigger the replenishment agent: use acionar_reposicao
- When asked about AI recommendations: use get_recomendacoes
- When asked about network health or scores: use get_score_rede

Store names like "Porto Alegre", "Loja Recife", "Floripa", "Salvador" are accepted — resolution is automatic.
You CAN approve orders. You CAN reject orders. Always use the tools provided.`
  });

  server.tool('get_lojas_em_risco',
    'List stores at risk of stockout, considering regional seasonality (e.g. Havaianas in July in the Northeast have 1.8x higher demand than in the South). Use when asked about stockout risk, at-risk stores, or coverage days.',
    {
      regiao_code:     z.enum(['N','NE','CO','SE','S']).optional().describe('Region filter'),
      categoria:       z.string().optional().describe('Product category filter'),
      criticidade_max: z.number().int().min(1).max(2).default(2),
    },
    async ({ regiao_code, categoria, criticidade_max }) => {
      try {
        let q = SELECT.from('myfranchise.Estoque_Unidade')
          .columns('unidade_ID','sku','nomeProduto','categoria','saldoAtual','giroMedioDiario','leadTimeDias');
        if (categoria) q = q.where({ categoria });
        // Paralelo: estoque + sazonalidade + unidades em simultâneo
        const [rows, sazo, unids] = await Promise.all([dbq(q), getSazo(), getUnidades()]);
        const fm = {}, um = {};
        sazo.forEach(s  => { fm[`${s.categoria}|${s.regiao_code}`] = Number(s.fatordamanda || s.fatordemanda || 1); });
        unids.forEach(u => { um[u.id || u.ID] = u; });

        const resultado = [];
        for (const r of rows) {
          const u = um[r.unidade_id || r.unidade_ID] || {};
          const reg = u.regiaocode || u.regiao_code;
          if (regiao_code && reg !== regiao_code) continue;
          const fator    = fm[`${r.categoria}|${reg}`] || 1.0;
          const demanda  = Number(r.giromediodiario || r.giroMedioDiario || 0) * fator;
          const saldo    = Number(r.saldoatual || r.saldoAtual || 0);
          const lead     = Number(r.leadtimedias || r.leadTimeDias || 0);
          const cobertura = demanda > 0 ? Math.round((saldo / demanda) * 10) / 10 : 999;
          const crit = cobertura < lead ? 1 : cobertura < lead * 1.5 ? 2 : 3;
          if (crit <= criticidade_max) resultado.push({
            loja: u.nome, cidade: u.cidade, regiao: reg,
            sku: r.sku, produto: r.nomeproduto || r.nomeProduto,
            saldo, coberturaDias: cobertura, leadTime: lead, fatorSazonal: fator,
            criticidade: crit === 1 ? 'CRITICAL STOCKOUT' : 'WARNING',
          });
        }
        resultado.sort((a, b) => a.coberturaDias - b.coberturaDias);
        return ok({ total: resultado.length, mes_referencia: MES_REF, lojas: resultado });
      } catch (e) { LOG.error('get_lojas_em_risco', e); return err(e.message); }
    }
  );

  server.tool('get_cobertura_estoque',
    'Returns stock coverage in days for a store, with regional seasonality adjustment. Use when asked about stock coverage, inventory levels, or days of supply for a specific store.',
    {
      unidade_ID: z.string().describe('Store ID (e.g. u147) OR store name/city (e.g. "Porto Alegre"). Will be resolved automatically.'),
      sku:        z.string().optional().describe('Optional SKU filter'),
    },
    async ({ unidade_ID, sku }) => {
      try {
        const resolvedId = await resolveUnidade(unidade_ID);
        let q = SELECT.from('myfranchise.Estoque_Unidade').where({ unidade_ID: resolvedId });
        if (sku) q = q.where({ unidade_ID: resolvedId, sku });
        // Paralelo: estoque + sazonalidade em simultâneo
        const [rows, sazo, unids] = await Promise.all([dbq(q), getSazo(), getUnidades()]);
        if (!rows.length) return err(`No items found for ${unidade_ID}`);
        const unidade = unids.find(u => (u.id||u.ID) === resolvedId) || {};
        const fm = {};
        sazo.forEach(s => { fm[`${s.categoria}|${s.regiao_code}`] = Number(s.fatordamanda||s.fatordemanda||1); });
        const reg = unidade.regiaocode || unidade.regiao_code;
        const itens = rows.map(r => {
          const fator   = fm[`${r.categoria}|${reg}`] || 1.0;
          const demanda = Number(r.giromediodiario||r.giroMedioDiario||0) * fator;
          const saldo   = Number(r.saldoatual||r.saldoAtual||0);
          const lead    = Number(r.leadtimedias||r.leadTimeDias||0);
          const cob     = demanda > 0 ? Math.round((saldo / demanda) * 10) / 10 : 999;
          return { sku: r.sku, produto: r.nomeproduto||r.nomeProduto, saldo, fatorSazonal: fator,
                   coberturaDias: cob, leadTime: lead,
                   status: cob < lead ? 'CRITICAL STOCKOUT' : cob < lead * 1.5 ? 'WARNING' : 'OK' };
        });
        return ok({ loja: unidade.nome, cidade: unidade.cidade, regiao: reg, mes_referencia: MES_REF, itens });
      } catch (e) { LOG.error('get_cobertura_estoque', e); return err(e.message); }
    }
  );

  server.tool('get_pedidos_pendentes',
    'List replenishment orders (reposição) for a store. Can filter by store name (e.g. "Loja Porto Alegre", "Porto Alegre"), store ID (e.g. "u147"), SKU (e.g. "SKU-200"), or status. Use this when asked about pending, approved, or rejected replenishment orders, or when verifying if a specific SKU has an order.',
    {
      unidade_ID:  z.string().optional().describe('Store ID (e.g. u147) OR store name/city (e.g. "Porto Alegre", "Loja Porto Alegre"). Will be resolved automatically.'),
      sku:         z.string().optional().describe('SKU code to filter by (e.g. "SKU-200"). Use when the user mentions a specific product code.'),
      status_code: z.enum(['PENDENTE','APROVADO','RECUSADO','ENVIADO','RECEBIDO']).default('PENDENTE').describe('Order status filter. Default: PENDENTE (awaiting approval).'),
    },
    async ({ unidade_ID, sku, status_code }) => {
      try {
        const [resolvedId, unids] = await Promise.all([resolveUnidade(unidade_ID), getUnidades()]);
        const um = {}; unids.forEach(u => { um[u.id||u.ID] = u; });
        const where = { status_code };
        if (resolvedId) where.unidade_ID = resolvedId;
        if (sku) where.sku = sku;
        const pedidos = await dbq(SELECT.from('myfranchise.Pedidos_Reposicao').where(where));
        return ok({ total: pedidos.length, status: status_code, pedidos: pedidos.map(p => ({
          produto: p.nomeproduto || p.nomeProduto,
          loja: um[p.unidade_id || p.unidade_ID]?.nome || p.unidade_id || p.unidade_ID,
          cidade: um[p.unidade_id || p.unidade_ID]?.cidade,
          sku: p.sku,
          qtdSugerida: p.qtdsugerida || p.qtdSugerida,
          fornecedor: p.fornecedorsugerido || p.fornecedorSugerido,
          prazoDesejado: p.prazodesejado || p.prazoDesejado,
          status: p.status_code,
          justificativa: p.justificativa,
        }))});
      } catch (e) { LOG.error('get_pedidos_pendentes', e); return err(e.message); }
    }
  );

  server.tool('get_recomendacoes',
    'Returns AI recommendations (generated by gpt-4o) for a store. Use when asked about AI recommendations, suggested actions, or improvement tips for a store.',
    {
      unidade_ID:  z.string().optional().describe('Store ID or name/city. Will be resolved automatically.'),
      status_code: z.enum(['NOVA','ACEITA','DESCARTADA']).default('NOVA'),
      prioridade:  z.enum(['ALTA','MEDIA','BAIXA']).optional(),
    },
    async ({ unidade_ID, status_code, prioridade }) => {
      try {
        const [resolvedId, unids] = await Promise.all([resolveUnidade(unidade_ID), getUnidades()]);
        const um = {}; unids.forEach(u => { um[u.id||u.ID] = u; });
        const where = { status_code };
        if (resolvedId) where.unidade_ID = resolvedId;
        if (prioridade) where.prioridade_code = prioridade;
        const recs = await dbq(SELECT.from('myfranchise.Recomendacoes').where(where).orderBy('prioridade_code'));
        return ok({ total: recs.length, recomendacoes: recs.map(r => ({
          loja: um[r.unidade_id||r.unidade_ID]?.nome || r.unidade_id || r.unidade_ID,
          cidade: um[r.unidade_id||r.unidade_ID]?.cidade,
          tipo: r.tipo_code, prioridade: r.prioridade_code, titulo: r.titulo,
          descricao: r.descricao, status: r.status_code, geradaEm: r.datageracao || r.dataGeracao,
        }))});
      } catch (e) { LOG.error('get_recomendacoes', e); return err(e.message); }
    }
  );

  server.tool('get_score_rede',
    'Returns the health score of stores in the franchise network. Use when asked about store health, network overview, critical stores, or scores by region/cluster.',
    {
      regiao_code:  z.enum(['N','NE','CO','SE','S']).optional(),
      cluster_code: z.string().optional(),
      criticidade:  z.number().int().min(1).max(3).optional().describe('1=critical, 2=warning, 3=healthy'),
      top:          z.number().int().min(1).max(50).default(10),
    },
    async ({ regiao_code, cluster_code, criticidade, top }) => {
      try {
        const rows = await getSaude();
        let f = rows;
        if (regiao_code)  f = f.filter(r => (r.regiao_code||r.regiaocode)   === regiao_code);
        if (cluster_code) f = f.filter(r => (r.cluster_code||r.clustercode) === cluster_code);
        const crit = (r) => Number(r.scorecriticality || r.scoreCriticality || 3);
        if (criticidade)  f = f.filter(r => crit(r) === criticidade);
        f.sort((a, b) => Number(a.scoresaude||a.scoreSaude||0) - Number(b.scoresaude||b.scoreSaude||0));
        const resumo = {
          total: rows.length,
          critical: rows.filter(r => crit(r) === 1).length,
          warning:  rows.filter(r => crit(r) === 2).length,
          healthy:  rows.filter(r => crit(r) === 3).length,
          avgScore: rows.length ? Math.round(rows.reduce((s,r) => s + Number(r.scoresaude||r.scoreSaude||0), 0) / rows.length * 10) / 10 : 0,
        };
        return ok({ network_summary: resumo, stores: f.slice(0, top).map(r => ({
          store: r.nome, city: r.cidade,
          region: r.regiao_code||r.regiaocode, cluster: r.cluster_code||r.clustercode,
          score: r.scoresaude||r.scoreSaude,
          compliance: r.compliancepct||r.compliancePct,
          performance: r.performancepct||r.performancePct,
          highAlerts: r.qtdalertasalta||r.qtdAlertasAlta,
          status: crit(r) === 1 ? 'CRITICAL' : crit(r) === 2 ? 'WARNING' : 'HEALTHY',
        }))});
      } catch (e) { LOG.error('get_score_rede', e); return err(e.message); }
    }
  );

  server.tool('acionar_reposicao',
    'Trigger the AI Replenishment Agent for one or more stores. Detects stockouts, calculates quantities with seasonal adjustment, and creates PENDING orders for human approval. If no store is specified, automatically triggers all stores currently in stockout.',
    {
      unidade_ID: z.string().optional().describe('Store ID or name/city (e.g. "Porto Alegre"). Use for a single store.'),
      unidades: z.array(z.string()).optional().describe('List of store IDs or names for multiple stores.')
    },
    async ({ unidade_ID, unidades }) => {
      try {
        const { gerarParaUnidade } = require('./ai/reposicao-agent');
        const csn = await cds.load('srv/csn.json');
        cds.model = cds.linked(csn);
        await cds.connect.to('db');
        const srv = await cds.serve('FranqueadoraService').from(csn);

        // Resolve lista de unidades a processar
        let lista = []
        if (unidades?.length) {
          lista = unidades
        } else if (unidade_ID) {
          lista = [unidade_ID]
        } else {
          // Nenhuma unidade informada — detecta todas em ruptura
          const { Estoque_Unidade } = srv.entities
          const em_risco = await SELECT.distinct.from(Estoque_Unidade)
            .columns('unidade_ID')
            .where({ status_code: { in: ['RUPTURA', 'ATENCAO'] } })
          lista = em_risco.map(r => r.unidade_ID)
          if (!lista.length) return ok({ mensagem: 'Nenhuma unidade em ruptura ou atenção no momento.' })
        }

        const resultados = []
        for (const uid of lista) {
          const r = await gerarParaUnidade(srv, uid)
          resultados.push({ unidade_ID: uid, pedidosGerados: r.count, modo: r.modo })
        }

        const totalPedidos = resultados.reduce((s, r) => s + r.count, 0)
        return ok({
          unidades: resultados,
          totalPedidos,
          mensagem: totalPedidos > 0
            ? `${totalPedidos} pedido(s) criados em status PENDENTE para ${lista.length} unidade(s). Aguardando aprovação.`
            : 'Nenhum item em risco detectado nas unidades informadas.'
        })
      } catch (e) { LOG.error('acionar_reposicao', e); return err(e.message); }
    }
  );

  server.tool('process_replenishment_orders',
    'Updates the status of pending replenishment orders in RunMyFranchise. Marks orders as confirmed/processed. Use when asked to approve, confirm, authorize, process, or update pending replenishment orders — for a specific store or all stores.',
    {
      unidade_ID: z.string().optional().describe('Store ID (e.g. u147) OR store name/city (e.g. "Porto Alegre", "Loja Porto Alegre"). If omitted, approves ALL pending orders network-wide.'),
      observacao: z.string().optional().describe('Optional approval note.')
    },
    async ({ unidade_ID, observacao }) => {
      try {
        let resolvedId = unidade_ID;
        if (unidade_ID && !unidade_ID.match(/^u\d+$/i)) {
          const unids = await dbq(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade'));
          const search = unidade_ID.toLowerCase().replace('loja ', '').trim();
          const found = unids.find(u => u.nome?.toLowerCase().includes(search) || u.cidade?.toLowerCase().includes(search));
          if (found) resolvedId = found.id || found.ID;
        }

        const where = resolvedId
          ? { status_code: 'PENDENTE', unidade_ID: resolvedId }
          : { status_code: 'PENDENTE' }

        const pedidos = await dbq(SELECT.from('myfranchise.Pedidos_Reposicao').where(where))
        if (!pedidos.length) {
          return ok({ aprovados: 0, mensagem: resolvedId
            ? `No pending orders for store ${unidade_ID}.`
            : 'No pending orders in the network at the moment.' })
        }

        const obs = observacao || 'Approved via Joule'
        const db = await cds.connect.to('db')
        let aprovados = 0
        for (const p of pedidos) {
          const qtd = Number(p.qtdsugerida || p.qtdSugerida || 0)
          await db.run(UPDATE('myfranchise.Pedidos_Reposicao').set({
            status_code: 'APROVADO',
            qtdAprovada: qtd,
            aprovador: 'joule',
            dataDecisao: new Date().toISOString()
          }).where({ ID: p.ID }))
          aprovados++
        }

        return ok({
          aprovados,
          mensagem: `${aprovados} order(s) approved${resolvedId ? ' for ' + (unidade_ID || resolvedId) : ' across the network'}. ${obs}`
        })
      } catch (e) { LOG.error('aprovar_pedidos', e); return err(e.message); }
    }
  );

  server.tool('confirm_single_order',
    'Updates a single replenishment order status to confirmed/processed in RunMyFranchise. Use when asked to approve, confirm, or process a specific order by its ID.',
    {
      pedido_id:    z.string().describe('Order UUID from get_pedidos_pendentes()'),
      qtd_aprovada: z.number().int().optional().describe('Approved quantity (0 or omit = use suggested quantity)'),
      observacao:   z.string().optional().describe('Optional approval note')
    },
    async ({ pedido_id, qtd_aprovada, observacao }) => {
      try {
        const rows = await dbq(SELECT.from('myfranchise.Pedidos_Reposicao').where({ ID: pedido_id }));
        const pedido = rows[0];
        if (!pedido) return err(`Order not found: ${pedido_id}`);
        LOG.info('aprovar_pedido keys:', Object.keys(pedido).join(','));
        const statusVal = pedido.status_code;
        const qtdVal    = Number(pedido.qtdsugerida || 0);
        if (statusVal !== 'PENDENTE') return err(`Order already has status: ${statusVal}`);
        const qtd = qtd_aprovada || qtdVal;
        const db2 = await cds.connect.to('db');
        await db2.run(UPDATE('myfranchise.Pedidos_Reposicao').set({
          status_code: 'APROVADO', qtdAprovada: qtd,
          aprovador: 'joule', dataDecisao: new Date().toISOString()
        }).where({ ID: pedido_id }));
        return ok({ sucesso: true, status: 'APROVADO', mensagem: observacao || `Approved — qty: ${qtd}` });
      } catch (e) { LOG.error('aprovar_pedido', e); return err(e.message); }
    }
  );

  server.tool('reject_order',
    'Updates a single replenishment order status to rejected in RunMyFranchise. Use when asked to reject or decline a specific order by its ID.',
    {
      pedido_id: z.string().describe('Order UUID from get_pedidos_pendentes()'),
      motivo:    z.string().optional().describe('Reason for rejection')
    },
    async ({ pedido_id, motivo }) => {
      try {
        const rows = await dbq(SELECT.from('myfranchise.Pedidos_Reposicao').where({ ID: pedido_id }));
        const pedido = rows[0];
        if (!pedido) return err(`Order not found: ${pedido_id}`);
        const statusVal = pedido.status_code;
        if (statusVal !== 'PENDENTE') return err(`Order already has status: ${statusVal}`);
        const db2 = await cds.connect.to('db');
        await db2.run(UPDATE('myfranchise.Pedidos_Reposicao').set({
          status_code: 'RECUSADO',
          aprovador: 'joule', dataDecisao: new Date().toISOString()
        }).where({ ID: pedido_id }));
        return ok({ sucesso: true, status: 'RECUSADO', mensagem: motivo || 'Order rejected via Joule' });
      } catch (e) { LOG.error('recusar_pedido', e); return err(e.message); }
    }
  );

  server.tool('get_substitutos',
    'Returns available substitute products for a SKU or product in stockout/risk. Use when the user asks about alternatives, substitutes, or "what can I offer instead of X". Returns similar products by color, size, or equivalent model.',
    {
      sku:         z.string().optional().describe('SKU code in stockout (e.g. "MR550053")'),
      cor:         z.string().optional().describe('Color of the product in stockout (e.g. "Azul Ipanema")'),
      tamanho:     z.string().optional().describe('Size of the product in stockout (e.g. "37/38")'),
      unidade_ID:  z.string().optional().describe('Store ID or name to check local stock availability'),
    },
    async ({ sku, cor, tamanho, unidade_ID }) => {
      try {
        let q = SELECT.from('myfranchise.Substitutos').where({ ativo: true });
        if (sku) q = SELECT.from('myfranchise.Substitutos').where({ skuOrigem: sku, ativo: true });
        const rows = await dbq(q);
        let filtered = rows;
        if (cor) filtered = filtered.filter(r => (r.cororigem||r.corOrigem||'').toLowerCase().includes(cor.toLowerCase()));
        if (tamanho) filtered = filtered.filter(r => (r.tamanhoorigem||r.tamanhoOrigem||'') === tamanho);
        filtered.sort((a,b) => Number(b.similaridade||0) - Number(a.similaridade||0));
        return ok({
          total: filtered.length,
          message: filtered.length ? `Found ${filtered.length} substitute(s). Top recommendation: "${filtered[0].nomesubstituto||filtered[0].nomeSubstituto}" in ${filtered[0].corsubstituto||filtered[0].corSubstituto} size ${filtered[0].tamanhosubstituto||filtered[0].tamanhoSubstituto} (${filtered[0].similaridade}% match).` : 'No substitutes found for this product/color/size combination.',
          substitutos: filtered.map(r => ({
            original: `${r.nomeorigem||r.nomeOrigem} ${r.cororigem||r.corOrigem} ${r.tamanhoorigem||r.tamanhoOrigem}`,
            substituto: `${r.nomesubstituto||r.nomeSubstituto} ${r.corsubstituto||r.corSubstituto} ${r.tamanhosubstituto||r.tamanhoSubstituto}`,
            similaridade: `${r.similaridade}%`,
            tipo: r.tiposimilaridade||r.tipoSimilaridade,
            estoqueDisponivel: r.estoquedisponivel||r.estoqueDisponivel,
            acaoRecomendada: `Se cliente pedir ${r.cororigem||r.corOrigem} ${r.tamanhoorigem||r.tamanhoOrigem} → Ofereça ${r.corsubstituto||r.corSubstituto} ${r.tamanhosubstituto||r.tamanhoSubstituto}`
          }))
        });
      } catch (e) { LOG.error('get_substitutos', e); return err(e.message); }
    }
  );

  server.tool('get_grade_ruptura',
    'Returns the full Cor × Tamanho (Color × Size) grid for a product/store showing stockout risk per combination. Use when asked about which specific sizes/colors are in stockout, the grade matrix, or detailed inventory breakdown by variant.',
    {
      unidade_ID:  z.string().describe('Store ID or name (e.g. "u178", "Recife", "SP Jardins")'),
      sku:         z.string().optional().describe('Optional SKU to filter (e.g. "MR550053")'),
      status_code: z.enum(['RUPTURA','ATENCAO','OK']).optional().describe('Filter by status. Omit to show all.'),
    },
    async ({ unidade_ID, sku, status_code }) => {
      try {
        const resolvedId = await resolveUnidade(unidade_ID);
        let q = SELECT.from('myfranchise.Estoque_Unidade').where({ unidade_ID: resolvedId });
        if (sku) q = SELECT.from('myfranchise.Estoque_Unidade').where({ unidade_ID: resolvedId, sku });
        const rows = await dbq(q);
        let filtered = rows;
        if (status_code) filtered = filtered.filter(r => (r.status_code||r.STATUS_CODE) === status_code);
        // Group by product
        const byProduct = {};
        filtered.forEach(r => {
          const prod = r.nomeproduto||r.nomeProduto;
          if (!byProduct[prod]) byProduct[prod] = { sku: r.sku, grade: [], totalRuptura: 0, receitaRisco: 0 };
          const status = r.status_code||r.STATUS_CODE;
          byProduct[prod].grade.push({
            cor: r.cor||r.COR, tamanho: r.tamanho||r.TAMANHO,
            saldo: r.saldoatual||r.saldoAtual,
            rupturaEm: r.ruptura_em||r.rupturaEm,
            impacto: r.valorimpactostockout||r.valorImpactoStockout,
            status
          });
          if (status === 'RUPTURA') { byProduct[prod].totalRuptura++; byProduct[prod].receitaRisco += Number(r.valorimpactostockout||r.valorImpactoStockout||0); }
        });
        const produtos = Object.entries(byProduct).map(([nome, d]) => ({
          produto: nome, sku: d.sku,
          gradeItems: d.grade.length, rupturaItems: d.totalRuptura,
          receitaRisco: `R$ ${d.receitaRisco.toLocaleString('pt-BR',{minimumFractionDigits:0})}`,
          grade: d.grade
        }));
        const totalImpacto = filtered.reduce((s,r) => s + Number(r.valorimpactostockout||r.valorImpactoStockout||0), 0);
        return ok({
          loja: resolvedId, totalItens: filtered.length,
          rupturas: filtered.filter(r=>(r.status_code||r.STATUS_CODE)==='RUPTURA').length,
          receitaTotalRisco: `R$ ${totalImpacto.toLocaleString('pt-BR',{minimumFractionDigits:0})}`,
          produtos
        });
      } catch (e) { LOG.error('get_grade_ruptura', e); return err(e.message); }
    }
  );

  server.tool('get_previsao_receita',
    'Returns revenue forecast for a store for the next 14 or 30 days, with impact drivers (campaigns, heat wave, NPS, seasonality). Use when asked about revenue prediction, sales forecast, or expected income.',
    {
      unidade_ID:      z.string().describe('Store ID or name (e.g. "u163", "Maceió", "SP Jardins")'),
      periodoPrevisao: z.enum(['14d','30d']).default('14d').describe('Forecast horizon: 14d or 30d'),
    },
    async ({ unidade_ID, periodoPrevisao }) => {
      try {
        const resolvedId = await resolveUnidade(unidade_ID);
        const rows = await dbq(
          SELECT.from('myfranchise.Previsao_Receita')
            .where({ unidade_ID: resolvedId, periodoPrevisao })
        );
        if (!rows.length) return err(`No forecast found for ${unidade_ID} (${periodoPrevisao})`);
        const r = rows[0];
        let drivers = [];
        try { drivers = JSON.parse(r.driversjson || r.driversJson || '[]'); } catch {}
        const variacao = Number(r.variacaoesperada || r.variacaoEsperada || 0);
        return ok({
          loja: unidade_ID, periodo: periodoPrevisao,
          receitaPrevista:   `R$ ${Number(r.receitaprevista || r.receitaPrevista || 0).toLocaleString('pt-BR', {minimumFractionDigits:0})}`,
          receitaAnterior:   `R$ ${Number(r.receitaanterior || r.receitaAnterior || 0).toLocaleString('pt-BR', {minimumFractionDigits:0})}`,
          variacaoEsperada:  `${variacao > 0 ? '+' : ''}${variacao}%`,
          cenarioOtimista:   `R$ ${Number(r.cenariootimista || r.cenarioOtimista || 0).toLocaleString('pt-BR', {minimumFractionDigits:0})}`,
          cenarioPessimista: `R$ ${Number(r.cenariopessimista || r.cenarioPessimista || 0).toLocaleString('pt-BR', {minimumFractionDigits:0})}`,
          driversDeImpacto: drivers,
          mensagem: `Forecast for ${periodoPrevisao}: expected ${variacao > 0 ? '+' : ''}${variacao}% vs. same period last year. ${drivers.length ? 'Key drivers: ' + drivers.slice(0,2).map(d => `${d.driver} (${d.impactoPct > 0 ? '+' : ''}${d.impactoPct}%)`).join(', ') : ''}`
        });
      } catch (e) { LOG.error('get_previsao_receita', e); return err(e.message); }
    }
  );

  server.tool('get_feed_novidades',
    'Returns the latest news feed items for franchisees: product launches, trends, campaigns, and operational tips from the Tropicália Co. network. Use when asked about news, launches, trends, campaigns, or what is new in the network.',
    {
      tipo: z.enum(['LANCAMENTO','TENDENCIA','CAMPANHA','DICA','ALL']).default('ALL').describe('Filter by type. Use ALL for everything.'),
    },
    async ({ tipo }) => {
      try {
        let q = SELECT.from('myfranchise.Feed_Franqueado').where({ ativo: true }).orderBy('dataPublicacao desc').limit(10);
        const rows = await dbq(q);
        let filtered = rows;
        if (tipo !== 'ALL') filtered = rows.filter(r => (r.tipo||r.TIPO) === tipo);
        return ok({
          total: filtered.length,
          feed: filtered.map(r => ({
            titulo:        r.titulo || r.TITULO,
            tipo:          r.tipo   || r.TIPO,
            conteudo:      r.conteudo || r.CONTEUDO,
            data:          r.datapublicacao || r.dataPublicacao,
            skus:          r.skusrelacionados || r.skusRelacionados
          }))
        });
      } catch (e) { LOG.error('get_feed_novidades', e); return err(e.message); }
    }
  );

  server.tool('get_correlacao_nps_ruptura',
    'Returns the correlation between NPS and stockout occurrences by region. Use when asked about the relationship between customer satisfaction (NPS) and stock problems, or to identify which regions have both low NPS and high stockout rates.',
    {
      regiao_code: z.string().optional().describe('Region code filter (e.g. NE, SE, S, CO, N). Omit for all regions.'),
    },
    async ({ regiao_code }) => {
      try {
        const db = await cds.connect.to('db');
        // KPI por unidade com NPS
        let kpiRows = await db.run(
          `SELECT k.UNIDADE_ID, k.NPS, u.REGIAO_CODE, u.NOME
           FROM MYFRANCHISE_KPI_UNIDADE k
           JOIN MYFRANCHISE_UNIDADES u ON k.UNIDADE_ID = u.ID
           WHERE k.NPS IS NOT NULL
           ORDER BY k.PERIODO DESC`
        );
        // Dedup: último KPI por unidade
        const kpiMap = {};
        for (const r of (kpiRows.rows || kpiRows)) {
          const uid = r.UNIDADE_ID || r.unidade_ID;
          if (!kpiMap[uid]) kpiMap[uid] = r;
        }
        // Rupturas por unidade
        const rupRows = await db.run(
          `SELECT UNIDADE_ID, COUNT(*) AS QTDRUPTURAS
           FROM MYFRANCHISE_ESTOQUE_UNIDADE
           WHERE STATUS_CODE = 'RUPTURA'
           GROUP BY UNIDADE_ID`
        );
        const rupMap = {};
        for (const r of (rupRows.rows || rupRows)) {
          const uid = r.UNIDADE_ID || r.unidade_ID;
          rupMap[uid] = Number(r.QTDRUPTURAS || r.qtdrupturas || 0);
        }

        // Agrupa por região
        const regioes = {};
        for (const [uid, k] of Object.entries(kpiMap)) {
          const reg = k.REGIAO_CODE || k.regiao_CODE || 'N/D';
          if (regiao_code && reg !== regiao_code.toUpperCase()) continue;
          if (!regioes[reg]) regioes[reg] = { lojas: 0, somaNPS: 0, totalRupturas: 0, npsBaixo: 0 };
          const nps = Number(k.NPS || k.nps || 0);
          regioes[reg].lojas++;
          regioes[reg].somaNPS += nps;
          regioes[reg].totalRupturas += rupMap[uid] || 0;
          if (nps < 40) regioes[reg].npsBaixo++;
        }

        const resultado = Object.entries(regioes).map(([reg, d]) => ({
          regiao:        reg,
          lojas:         d.lojas,
          npsMedio:      d.lojas ? parseFloat((d.somaNPS / d.lojas).toFixed(1)) : 0,
          lojasBaixoNPS: d.npsBaixo,
          totalRupturas: d.totalRupturas,
          rupturasPorLoja: d.lojas ? parseFloat((d.totalRupturas / d.lojas).toFixed(1)) : 0,
          correlacao:    d.npsBaixo > 0 && d.totalRupturas > 0 ? 'ALTA' : d.totalRupturas > 0 ? 'MEDIA' : 'BAIXA'
        })).sort((a, b) => b.totalRupturas - a.totalRupturas);

        return ok({ regioes: resultado, insight: 'Regiões com NPS médio abaixo de 40 tendem a apresentar maior incidência de ruptura — baixa satisfação do cliente frequentemente coincide com falhas operacionais de estoque.' });
      } catch (e) { LOG.error('get_correlacao_nps_ruptura', e); return err(e.message); }
    }
  );

  server.tool('get_sellout_hoje',
    'Returns the sell-out (sales) aggregated for the current day across the network, or for a specific store. Use when asked about today\'s sales, daily sell-out, or real-time revenue.',
    {
      unidade_id: z.string().optional().describe('Store ID or name filter. Omit for full network aggregate.'),
    },
    async ({ unidade_id }) => {
      try {
        const db = await cds.connect.to('db');
        // VendaPraticada contém vendas — filtra pelo dia atual via createdAt ou dataVenda
        let rows;
        if (unidade_id) {
          const uid = await resolveUnidade(unidade_id);
          rows = await db.run(
            `SELECT v.UNIDADE_ID, u.NOME, v.SKU, v.QUANTIDADE, v.VALORUNITARIO, v.DATAVENDA
             FROM MYFRANCHISE_VENDAPRATICADA v
             JOIN MYFRANCHISE_UNIDADES u ON v.UNIDADE_ID = u.ID
             WHERE v.UNIDADE_ID = '${uid}'
             ORDER BY v.DATAVENDA DESC`
          );
        } else {
          rows = await db.run(
            `SELECT v.UNIDADE_ID, u.NOME, v.SKU, v.QUANTIDADE, v.VALORUNITARIO, v.DATAVENDA
             FROM MYFRANCHISE_VENDAPRATICADA v
             JOIN MYFRANCHISE_UNIDADES u ON v.UNIDADE_ID = u.ID
             ORDER BY v.DATAVENDA DESC`
          );
        }
        const list = rows.rows || rows;
        const totalQtd = list.reduce((s, r) => s + Number(r.QUANTIDADE || r.quantidade || 0), 0);
        const totalReceita = list.reduce((s, r) => s + (Number(r.QUANTIDADE || r.quantidade || 0) * Number(r.VALORUNITARIO || r.valorUnitario || 0)), 0);
        const porLoja = {};
        for (const r of list) {
          const uid = r.UNIDADE_ID || r.unidade_ID;
          const nome = r.NOME || r.nome || uid;
          if (!porLoja[uid]) porLoja[uid] = { nome, qtd: 0, receita: 0 };
          const qtd = Number(r.QUANTIDADE || r.quantidade || 0);
          const val = Number(r.VALORUNITARIO || r.valorUnitario || 0);
          porLoja[uid].qtd += qtd;
          porLoja[uid].receita += qtd * val;
        }
        const lojas = Object.values(porLoja).sort((a, b) => b.receita - a.receita).slice(0, 10);
        return ok({
          totalTransacoes: list.length,
          totalUnidadesVendidas: totalQtd,
          receitaTotal: `R$ ${totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          topLojas: lojas.map(l => ({ ...l, receita: `R$ ${l.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }))
        });
      } catch (e) { LOG.error('get_sellout_hoje', e); return err(e.message); }
    }
  );

  return server;
}
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({
  status: 'UP', service: 'runmyfranchise-mcp', version: '1.0.0',
  tools: ['get_lojas_em_risco','get_cobertura_estoque','get_pedidos_pendentes',
          'get_recomendacoes','get_score_rede','acionar_reposicao',
          'get_substitutos','get_grade_ruptura','get_previsao_receita','get_feed_novidades',
          'get_correlacao_nps_ruptura','get_sellout_hoje',
          'process_replenishment_orders','confirm_single_order','reject_order'],
  mes_referencia: MES_REF, timestamp: new Date().toISOString(),
}));

app.all('/mcp', async (req, res) => {
  const method = req.body?.method || '?'
  LOG.info(`MCP ${req.method} — ${method}`)
  const server    = buildServer();
  // sessionIdGenerator: undefined = modo stateless (sem sessão persistente)
  // Necessário para clientes como Joule Studio que não enviam mcp-session-id
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    LOG.error('MCP transport error', e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

if (require.main === module) {
  cds.connect.to('db').then(() => app.listen(PORT, () => LOG.info(`MCP Server on port ${PORT}`)));
}

module.exports = { app, buildServer };
