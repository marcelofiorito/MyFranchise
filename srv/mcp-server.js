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

// ── Factory: cria McpServer por request (evita "already connected") ──
function buildServer() {
  const server = new McpServer({ name: 'runmyfranchise-mcp', version: '1.0.0' });

  server.tool('get_lojas_em_risco',
    'Lista lojas com risco de ruptura de estoque, considerando sazonalidade regional (ex: Havaianas em julho no Nordeste têm demanda 1,8x maior que no Sul).',
    {
      regiao_code:     z.enum(['N','NE','CO','SE','S']).optional(),
      categoria:       z.string().optional(),
      criticidade_max: z.number().int().min(1).max(2).default(2),
    },
    async ({ regiao_code, categoria, criticidade_max }) => {
      try {
        const db = await cds.connect.to('db');
        let q = SELECT.from('myfranchise.Estoque_Unidade')
          .columns('unidade_ID','sku','nomeProduto','categoria','saldoAtual','giroMedioDiario','leadTimeDias');
        if (categoria) q = q.where({ categoria });
        const rows  = await db.run(q);
        const sazo  = await db.run(SELECT.from('myfranchise.Sazonalidade_Regional').where({ mes: MES_REF }));
        const unids = await db.run(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade','regiao_code'));
        const fm = {}, um = {};
        sazo.forEach(s  => { fm[`${s.categoria}|${s.regiao_code}`] = Number(s.fatorDemanda); });
        unids.forEach(u => { um[u.ID] = u; });

        const resultado = [];
        for (const r of rows) {
          const u = um[r.unidade_ID] || {};
          if (regiao_code && u.regiao_code !== regiao_code) continue;
          const fator    = fm[`${r.categoria}|${u.regiao_code}`] || 1.0;
          const demanda  = Number(r.giroMedioDiario) * fator;
          const cobertura = demanda > 0 ? Math.round((Number(r.saldoAtual) / demanda) * 10) / 10 : 999;
          const crit = cobertura < r.leadTimeDias ? 1 : cobertura < r.leadTimeDias * 1.5 ? 2 : 3;
          if (crit <= criticidade_max) resultado.push({
            loja: u.nome || r.unidade_ID, cidade: u.cidade, regiao: u.regiao_code,
            sku: r.sku, produto: r.nomeProduto, saldo: r.saldoAtual,
            coberturaDias: cobertura, leadTime: r.leadTimeDias, fatorSazonal: fator,
            criticidade: crit === 1 ? 'RUPTURA IMINENTE' : 'ATENÇÃO',
          });
        }
        resultado.sort((a, b) => a.coberturaDias - b.coberturaDias);
        return ok({ total: resultado.length, mes_referencia: MES_REF, lojas: resultado });
      } catch (e) { LOG.error('get_lojas_em_risco', e); return err(e.message); }
    }
  );

  server.tool('get_cobertura_estoque',
    'Retorna cobertura de estoque em dias de um SKU numa loja, com sazonalidade regional.',
    {
      unidade_ID: z.string(),
      sku:        z.string().optional(),
    },
    async ({ unidade_ID, sku }) => {
      try {
        const db = await cds.connect.to('db');
        let q = SELECT.from('myfranchise.Estoque_Unidade').where({ unidade_ID });
        if (sku) q = q.where({ unidade_ID, sku });
        const rows = await db.run(q);
        if (!rows.length) return err(`Nenhum item encontrado para ${unidade_ID}`);
        const unidade = await db.run(SELECT.one.from('myfranchise.Unidades').where({ ID: unidade_ID }));
        const sazo   = await db.run(SELECT.from('myfranchise.Sazonalidade_Regional').where({ mes: MES_REF }));
        const fm = {};
        sazo.forEach(s => { fm[`${s.categoria}|${s.regiao_code}`] = Number(s.fatorDemanda); });
        const itens = rows.map(r => {
          const fator   = fm[`${r.categoria}|${unidade?.regiao_code}`] || 1.0;
          const demanda = Number(r.giroMedioDiario) * fator;
          const cob     = demanda > 0 ? Math.round((Number(r.saldoAtual) / demanda) * 10) / 10 : 999;
          return { sku: r.sku, produto: r.nomeProduto, saldo: r.saldoAtual, fatorSazonal: fator,
                   coberturaDias: cob, leadTime: r.leadTimeDias,
                   status: cob < r.leadTimeDias ? 'RUPTURA IMINENTE' : cob < r.leadTimeDias * 1.5 ? 'ATENÇÃO' : 'OK' };
        });
        return ok({ loja: unidade?.nome, cidade: unidade?.cidade, regiao: unidade?.regiao_code, mes_referencia: MES_REF, itens });
      } catch (e) { LOG.error('get_cobertura_estoque', e); return err(e.message); }
    }
  );

  server.tool('get_pedidos_pendentes',
    'Lista pedidos de reposição aguardando aprovação.',
    {
      unidade_ID:  z.string().optional(),
      status_code: z.enum(['PENDENTE','APROVADO','RECUSADO','ENVIADO','RECEBIDO']).default('PENDENTE'),
    },
    async ({ unidade_ID, status_code }) => {
      try {
        const db = await cds.connect.to('db');
        const where = { status_code };
        if (unidade_ID) where.unidade_ID = unidade_ID;
        const pedidos = await db.run(SELECT.from('myfranchise.Pedidos_Reposicao').where(where));
        const unids   = await db.run(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade'));
        const um = {}; unids.forEach(u => { um[u.ID] = u; });
        return ok({ total: pedidos.length, status: status_code, pedidos: pedidos.map(p => ({
          id: p.ID, loja: um[p.unidade_ID]?.nome || p.unidade_ID, cidade: um[p.unidade_ID]?.cidade,
          sku: p.sku, produto: p.nomeProduto, qtdSugerida: p.qtdSugerida,
          fornecedor: p.fornecedorSugerido, prazoDesejado: p.prazoDesejado,
          status: p.status_code, justificativa: p.justificativa,
        }))});
      } catch (e) { LOG.error('get_pedidos_pendentes', e); return err(e.message); }
    }
  );

  server.tool('get_recomendacoes',
    'Retorna recomendações geradas pelo gpt-4o para uma loja, com descrição completa.',
    {
      unidade_ID:  z.string().optional(),
      status_code: z.enum(['NOVA','ACEITA','DESCARTADA']).default('NOVA'),
      prioridade:  z.enum(['ALTA','MEDIA','BAIXA']).optional(),
    },
    async ({ unidade_ID, status_code, prioridade }) => {
      try {
        const db = await cds.connect.to('db');
        const where = { status_code };
        if (unidade_ID) where.unidade_ID = unidade_ID;
        if (prioridade) where.prioridade_code = prioridade;
        const recs  = await db.run(SELECT.from('myfranchise.Recomendacoes').where(where).orderBy('prioridade_code'));
        const unids = await db.run(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade'));
        const um = {}; unids.forEach(u => { um[u.ID] = u; });
        return ok({ total: recs.length, recomendacoes: recs.map(r => ({
          id: r.ID, loja: um[r.unidade_ID]?.nome || r.unidade_ID, cidade: um[r.unidade_ID]?.cidade,
          tipo: r.tipo_code, prioridade: r.prioridade_code, titulo: r.titulo,
          descricao: r.descricao, status: r.status_code, geradaEm: r.dataGeracao,
        }))});
      } catch (e) { LOG.error('get_recomendacoes', e); return err(e.message); }
    }
  );

  server.tool('get_score_rede',
    'Retorna o score de saúde das lojas com filtros por região, cluster ou criticidade.',
    {
      regiao_code:  z.enum(['N','NE','CO','SE','S']).optional(),
      cluster_code: z.string().optional(),
      criticidade:  z.number().int().min(1).max(3).optional(),
      top:          z.number().int().min(1).max(50).default(10),
    },
    async ({ regiao_code, cluster_code, criticidade, top }) => {
      try {
        const db   = await cds.connect.to('db');
        const rows = await db.run(SELECT.from('myfranchise.Saude_Dashboard'));
        let f = rows;
        if (regiao_code)  f = f.filter(r => r.regiao_code   === regiao_code);
        if (cluster_code) f = f.filter(r => r.cluster_code  === cluster_code);
        if (criticidade)  f = f.filter(r => r.scoreCriticality === criticidade);
        f.sort((a, b) => a.scoreSaude - b.scoreSaude);
        const resumo = {
          total: f.length,
          criticas:  rows.filter(r => r.scoreCriticality === 1).length,
          atencao:   rows.filter(r => r.scoreCriticality === 2).length,
          saudaveis: rows.filter(r => r.scoreCriticality === 3).length,
          scoreMedia: rows.length ? Math.round(rows.reduce((s,r) => s + Number(r.scoreSaude||0), 0) / rows.length * 10) / 10 : 0,
        };
        return ok({ resumo_rede: resumo, lojas: f.slice(0, top).map(r => ({
          loja: r.nome, cidade: r.cidade, regiao: r.regiao_code, cluster: r.cluster_code,
          score: r.scoreSaude, compliance: r.compliancePct, performance: r.performancePct,
          alertasAlta: r.qtdAlertasAlta,
          criticidade: r.scoreCriticality === 1 ? 'CRÍTICO' : r.scoreCriticality === 2 ? 'ATENÇÃO' : 'SAUDÁVEL',
        }))});
      } catch (e) { LOG.error('get_score_rede', e); return err(e.message); }
    }
  );

  server.tool('acionar_reposicao',
    'Aciona o Agente de Reposição para uma ou mais unidades: detecta ruptura, calcula quantidade com sazonalidade e cria pedidos PENDENTE para aprovação humana. Aceita uma unidade (unidade_ID) ou uma lista (unidades). Se nenhum dos dois for informado, aciona todas as unidades em ruptura automaticamente.',
    {
      unidade_ID: z.string().optional().describe('ID de uma única unidade (ex: u147). Use quando o usuário menciona uma loja específica.'),
      unidades: z.array(z.string()).optional().describe('Lista de IDs de unidades (ex: ["u147","u134"]). Use quando o usuário menciona múltiplas lojas.')
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

  return server;
}

// ── Express ──────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({
  status: 'UP', service: 'runmyfranchise-mcp', version: '1.0.0',
  tools: ['get_lojas_em_risco','get_cobertura_estoque','get_pedidos_pendentes',
          'get_recomendacoes','get_score_rede','acionar_reposicao'],
  mes_referencia: MES_REF, timestamp: new Date().toISOString(),
}));

app.all('/mcp', async (req, res) => {
  const server    = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => `rmf-${Date.now()}` });
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
