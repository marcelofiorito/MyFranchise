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

// HANA retorna nomes de coluna em UPPERCASE quando acessado sem modelo CDS
// norm() normaliza para lowercase; normAll() processa arrays
const norm    = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k.toLowerCase()] = v;
  return out;
};
const normAll = (rows) => Array.isArray(rows) ? rows.map(norm) : (rows ? [norm(rows)] : []);

// Wrapper: executa query e normaliza resultado
const dbq = async (query) => {
  const db = await cds.connect.to('db');
  const res = await db.run(query);
  return Array.isArray(res) ? normAll(res) : (res ? norm(res) : res);
};

// ── Factory: cria McpServer por request (evita "already connected") ──
function buildServer() {
  const server = new McpServer({ name: 'runmyfranchise-mcp', version: '1.0.0' });

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
        const rows  = await dbq(q);
        const sazo  = await dbq(SELECT.from('myfranchise.Sazonalidade_Regional').where({ mes: MES_REF }));
        const unids = await dbq(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade','regiao_code'));
        const fm = {}, um = {};
        sazo.forEach(s  => { fm[`${s.categoria}|${s.regiao_code}`] = Number(s.fatordamanda || s.fatordemanda || 1); });
        unids.forEach(u => { um[u.id || u.ID] = u; });

        const resultado = [];
        for (const r of rows) {
          const u = um[r.unidade_id || r.unidade_ID] || {};
          if (regiao_code && u.regiaocode !== regiao_code && u.regiao_code !== regiao_code) continue;
          const reg = u.regiaocode || u.regiao_code;
          const cat = r.categoria;
          const fator    = fm[`${cat}|${reg}`] || 1.0;
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
        // Resolve nome/cidade → ID
        let resolvedId = unidade_ID;
        if (unidade_ID && !unidade_ID.match(/^u\d+$/i)) {
          const unids = await dbq(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade'));
          const search = unidade_ID.toLowerCase().replace('loja ', '').trim();
          const found = unids.find(u => u.nome?.toLowerCase().includes(search) || u.cidade?.toLowerCase().includes(search));
          if (found) resolvedId = found.id || found.ID;
        }
        let q = SELECT.from('myfranchise.Estoque_Unidade').where({ unidade_ID: resolvedId });
        if (sku) q = q.where({ unidade_ID: resolvedId, sku });
        const rows = await dbq(q);
        if (!rows.length) return err(`No items found for ${unidade_ID}`);
        const unidades = await dbq(SELECT.from('myfranchise.Unidades').where({ ID: resolvedId }));
        const unidade = unidades[0] || {};
        const sazo   = await dbq(SELECT.from('myfranchise.Sazonalidade_Regional').where({ mes: MES_REF }));
        const fm = {};
        sazo.forEach(s => { fm[`${s.categoria}|${s.regiaocode||s.regiao_code}`] = Number(s.fatordamanda||s.fatordemanda||1); });
        const itens = rows.map(r => {
          const reg = unidade.regiaocode || unidade.regiao_code;
          const fator   = fm[`${r.categoria}|${reg}`] || 1.0;
          const demanda = Number(r.giromediodiario||r.giroMedioDiario||0) * fator;
          const saldo   = Number(r.saldoatual||r.saldoAtual||0);
          const lead    = Number(r.leadtimedias||r.leadTimeDias||0);
          const cob     = demanda > 0 ? Math.round((saldo / demanda) * 10) / 10 : 999;
          return { sku: r.sku, produto: r.nomeproduto||r.nomeProduto, saldo, fatorSazonal: fator,
                   coberturaDias: cob, leadTime: lead,
                   status: cob < lead ? 'CRITICAL STOCKOUT' : cob < lead * 1.5 ? 'WARNING' : 'OK' };
        });
        return ok({ loja: unidade.nome, cidade: unidade.cidade, regiao: unidade.regiaocode||unidade.regiao_code, mes_referencia: MES_REF, itens });
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
        const unids = await dbq(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade'));
        const um = {}; unids.forEach(u => { um[u.id||u.ID] = u; });

        // Resolve nome/cidade → ID
        let resolvedId = unidade_ID;
        if (unidade_ID && !unidade_ID.match(/^u\d+$/i)) {
          const search = unidade_ID.toLowerCase().replace('loja ', '').trim();
          const found = unids.find(u =>
            u.nome?.toLowerCase().includes(search) ||
            u.cidade?.toLowerCase().includes(search)
          );
          if (found) resolvedId = found.id || found.ID;
        }

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
        const unids = await dbq(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade'));
        const um = {}; unids.forEach(u => { um[u.id||u.ID] = u; });
        let resolvedId = unidade_ID;
        if (unidade_ID && !unidade_ID.match(/^u\d+$/i)) {
          const search = unidade_ID.toLowerCase().replace('loja ', '').trim();
          const found = unids.find(u => u.nome?.toLowerCase().includes(search) || u.cidade?.toLowerCase().includes(search));
          if (found) resolvedId = found.id || found.ID;
        }
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
        const rows = await dbq(SELECT.from('myfranchise.Saude_Dashboard'));
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

  server.tool('aprovar_pedidos',
    'Approve pending replenishment orders. Can approve all pending orders in the network, or only for a specific store (by name or ID). Uses the agent-suggested quantity as approved quantity.',
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
        let aprovados = 0
        for (const p of pedidos) {
          const qtd = p.qtdSugerida || p.QTDSUGERIDA || 0
          await UPDATE('myfranchise.Pedidos_Reposicao').set({
            status_code: 'APROVADO',
            qtdAprovada: qtd,
            aprovador: 'joule',
            dataDecisao: new Date().toISOString()
          }).where({ ID: p.ID })
          aprovados++
        }

        return ok({
          aprovados,
          mensagem: `${aprovados} order(s) approved${resolvedId ? ' for ' + (unidade_ID || resolvedId) : ' across the network'}. ${obs}`
        })
      } catch (e) { LOG.error('aprovar_pedidos', e); return err(e.message); }
    }
  );

  server.tool('aprovar_pedido',
    'Approve a single replenishment order by its ID. Use get_pedidos_pendentes() first to get the order ID. Use aprovar_pedidos (plural) to approve all at once.',
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
        await UPDATE('myfranchise.Pedidos_Reposicao').set({
          status_code: 'APROVADO', qtdAprovada: qtd,
          aprovador: 'joule', dataDecisao: new Date().toISOString()
        }).where({ ID: pedido_id });
        return ok({ sucesso: true, status: 'APROVADO', mensagem: observacao || `Approved — qty: ${qtd}` });
      } catch (e) { LOG.error('aprovar_pedido', e); return err(e.message); }
    }
  );

  server.tool('recusar_pedido',
    'Reject a single replenishment order by its ID. Use get_pedidos_pendentes() first to get the order ID.',
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
        await UPDATE('myfranchise.Pedidos_Reposicao').set({
          status_code: 'RECUSADO',
          aprovador: 'joule', dataDecisao: new Date().toISOString()
        }).where({ ID: pedido_id });
        return ok({ sucesso: true, status: 'RECUSADO', mensagem: motivo || 'Order rejected via Joule' });
      } catch (e) { LOG.error('recusar_pedido', e); return err(e.message); }
    }
  );

  return server;
}

// ── Express ──────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({
  status: 'UP', service: 'runmyfranchise-mcp', version: '1.0.0',
  tools: ['get_lojas_em_risco','get_cobertura_estoque','get_pedidos_pendentes',
          'get_recomendacoes','get_score_rede','acionar_reposicao',
          'aprovar_pedidos','aprovar_pedido','recusar_pedido'],
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
