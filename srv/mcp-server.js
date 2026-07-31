'use strict';

/**
 * MCP Server — RunMyFranchise
 *
 * Expõe ferramentas para o SAP Joule consultar dados da rede de franquias
 * via Model Context Protocol (MCP / Streamable HTTP).
 *
 * Este servidor NÃO possui LLM própria.
 * Ele executa consultas de negócio e retorna dados estruturados.
 * A inteligência (linguagem natural, raciocínio, formatação) é do SAP Joule.
 *
 * Tools disponíveis:
 *   get_lojas_em_risco      — lojas com risco de ruptura de estoque
 *   get_cobertura_estoque   — cobertura de um SKU numa loja específica
 *   get_pedidos_pendentes   — pedidos de reposição aguardando aprovação
 *   get_recomendacoes       — recomendações da IA para uma loja
 *   get_score_rede          — score de saúde das lojas com filtros
 *   acionar_reposicao       — gera pedidos de reposição via agente IA
 */

const { McpServer }  = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z }          = require('zod');
const express        = require('express');
const cds            = require('@sap/cds');

const PORT = process.env.PORT || process.env.MCP_PORT || 3001;
const LOG  = cds.log('mcp-server');

// ── Criar servidor MCP ──────────────────────────────────────────
const server = new McpServer({
  name:    'runmyfranchise-mcp',
  version: '1.0.0',
});

// ── Helpers ─────────────────────────────────────────────────────

/** Resultado de sucesso padronizado */
const ok = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});

/** Resultado de erro padronizado */
const err = (msg) => ({
  isError: true,
  content: [{ type: 'text', text: JSON.stringify({ error: msg }) }],
});

/** Mês corrente (fixo em julho para a demo — troca para `new Date().getMonth() + 1` em produção) */
const MES_REF = parseInt(process.env.MES_REFERENCIA || '7', 10);

// ── TOOL 1: lojas em risco de ruptura ───────────────────────────
server.tool(
  'get_lojas_em_risco',
  'Lista lojas com risco de ruptura de estoque, considerando sazonalidade regional. ' +
  'Filtros opcionais: região (N, NE, CO, SE, S), categoria de produto e criticidade (1=ruptura iminente, 2=atenção).',
  {
    regiao_code:     z.enum(['N','NE','CO','SE','S']).optional().describe('Código da região'),
    categoria:       z.string().optional().describe('Categoria do produto (ex: Sandálias, Calçado Fechado)'),
    criticidade_max: z.number().int().min(1).max(2).default(2).describe('1=só ruptura iminente, 2=ruptura+atenção'),
  },
  async ({ regiao_code, categoria, criticidade_max }) => {
    try {
      const db = await cds.connect.to('db');
      let q = SELECT.from('myfranchise.Estoque_Unidade')
        .columns('unidade_ID','sku','nomeProduto','categoria','saldoAtual','giroMedioDiario','leadTimeDias','status_code');
      if (categoria) q = q.where({ categoria });

      const rows = await db.run(q);

      // enriquecer com sazonalidade
      const sazo = await db.run(
        SELECT.from('myfranchise.Sazonalidade_Regional').where({ mes: MES_REF })
      );
      const fatorMap = {};
      sazo.forEach(s => { fatorMap[`${s.categoria}|${s.regiao_code}`] = Number(s.fatorDemanda); });

      // buscar região de cada unidade
      const unids = await db.run(SELECT.from('myfranchise.Unidades').columns('ID','nome','regiao_code','cidade'));
      const unidMap = {};
      unids.forEach(u => { unidMap[u.ID] = u; });

      const resultado = [];
      for (const r of rows) {
        const u = unidMap[r.unidade_ID] || {};
        if (regiao_code && u.regiao_code !== regiao_code) continue;

        const fator = fatorMap[`${r.categoria}|${u.regiao_code}`] || 1.0;
        const demanda = Number(r.giroMedioDiario) * fator;
        const cobertura = demanda > 0
          ? Math.round((Number(r.saldoAtual) / demanda) * 10) / 10
          : 999;
        const crit = cobertura < r.leadTimeDias ? 1 : cobertura < r.leadTimeDias * 1.5 ? 2 : 3;

        if (crit <= criticidade_max) {
          resultado.push({
            loja: u.nome || r.unidade_ID,
            cidade: u.cidade,
            regiao: u.regiao_code,
            sku: r.sku,
            produto: r.nomeProduto,
            saldo: r.saldoAtual,
            coberturaDias: cobertura,
            leadTime: r.leadTimeDias,
            fatorSazonal: fator,
            criticidade: crit === 1 ? 'RUPTURA IMINENTE' : 'ATENÇÃO',
          });
        }
      }

      resultado.sort((a, b) => a.coberturaDias - b.coberturaDias);
      return ok({ total: resultado.length, mes_referencia: MES_REF, lojas: resultado });
    } catch (e) {
      LOG.error('get_lojas_em_risco', e);
      return err(e.message);
    }
  }
);

// ── TOOL 2: cobertura de um SKU numa loja ───────────────────────
server.tool(
  'get_cobertura_estoque',
  'Retorna a cobertura de estoque (em dias) de um SKU específico numa loja, considerando sazonalidade regional.',
  {
    unidade_ID: z.string().describe('ID da unidade (ex: u178)'),
    sku:        z.string().optional().describe('Código do SKU (ex: SKU-100). Se omitido, retorna todos os SKUs da loja.'),
  },
  async ({ unidade_ID, sku }) => {
    try {
      const db = await cds.connect.to('db');
      let q = SELECT.from('myfranchise.Estoque_Unidade').where({ unidade_ID });
      if (sku) q = q.where({ unidade_ID, sku });

      const rows = await db.run(q);
      if (!rows.length) return err(`Nenhum item de estoque encontrado para a loja ${unidade_ID}`);

      const unidade = await db.run(SELECT.one.from('myfranchise.Unidades').where({ ID: unidade_ID }));
      const regiaoCode = unidade?.regiao_code;

      const sazo = await db.run(
        SELECT.from('myfranchise.Sazonalidade_Regional').where({ mes: MES_REF })
      );
      const fatorMap = {};
      sazo.forEach(s => { fatorMap[`${s.categoria}|${s.regiao_code}`] = Number(s.fatorDemanda); });

      const itens = rows.map(r => {
        const fator = fatorMap[`${r.categoria}|${regiaoCode}`] || 1.0;
        const demanda = Number(r.giroMedioDiario) * fator;
        const cobertura = demanda > 0 ? Math.round((Number(r.saldoAtual) / demanda) * 10) / 10 : 999;
        const crit = cobertura < r.leadTimeDias ? 'RUPTURA IMINENTE' : cobertura < r.leadTimeDias * 1.5 ? 'ATENÇÃO' : 'OK';
        return {
          sku: r.sku,
          produto: r.nomeProduto,
          categoria: r.categoria,
          saldo: r.saldoAtual,
          giroBase: r.giroMedioDiario,
          fatorSazonal: fator,
          demandaDiaria: Math.round(demanda * 10) / 10,
          coberturaDias: cobertura,
          leadTime: r.leadTimeDias,
          status: crit,
        };
      });

      return ok({
        loja: unidade?.nome || unidade_ID,
        cidade: unidade?.cidade,
        regiao: regiaoCode,
        mes_referencia: MES_REF,
        itens,
      });
    } catch (e) {
      LOG.error('get_cobertura_estoque', e);
      return err(e.message);
    }
  }
);

// ── TOOL 3: pedidos de reposição pendentes ───────────────────────
server.tool(
  'get_pedidos_pendentes',
  'Lista os pedidos de reposição em aberto (status PENDENTE), aguardando aprovação do gestor.',
  {
    unidade_ID: z.string().optional().describe('Filtrar por loja específica'),
    status_code: z.enum(['PENDENTE','APROVADO','RECUSADO','ENVIADO','RECEBIDO']).default('PENDENTE').describe('Status dos pedidos'),
  },
  async ({ unidade_ID, status_code }) => {
    try {
      const db = await cds.connect.to('db');
      let q = SELECT.from('myfranchise.Pedidos_Reposicao').where({ status_code });
      if (unidade_ID) q = q.where({ unidade_ID, status_code });

      const pedidos = await db.run(q);

      // enriquecer com nome da loja
      const unids = await db.run(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade'));
      const unidMap = {};
      unids.forEach(u => { unidMap[u.ID] = u; });

      const resultado = pedidos.map(p => ({
        id: p.ID,
        loja: unidMap[p.unidade_ID]?.nome || p.unidade_ID,
        cidade: unidMap[p.unidade_ID]?.cidade,
        sku: p.sku,
        produto: p.nomeProduto,
        qtdSugerida: p.qtdSugerida,
        fornecedor: p.fornecedorSugerido,
        prazoDesejado: p.prazoDesejado,
        status: p.status_code,
        origem: p.origem,
        justificativa: p.justificativa,
      }));

      return ok({ total: resultado.length, status: status_code, pedidos: resultado });
    } catch (e) {
      LOG.error('get_pedidos_pendentes', e);
      return err(e.message);
    }
  }
);

// ── TOOL 4: recomendações da IA para uma loja ───────────────────
server.tool(
  'get_recomendacoes',
  'Retorna as recomendações geradas pela IA (gpt-4o) para uma loja, com prioridade e descrição completa.',
  {
    unidade_ID:    z.string().optional().describe('ID da loja (ex: u147). Se omitido, retorna de todas.'),
    status_code:   z.enum(['NOVA','ACEITA','DESCARTADA']).default('NOVA').describe('Status das recomendações'),
    prioridade:    z.enum(['ALTA','MEDIA','BAIXA']).optional().describe('Filtrar por prioridade'),
  },
  async ({ unidade_ID, status_code, prioridade }) => {
    try {
      const db = await cds.connect.to('db');
      const where = { status_code };
      if (unidade_ID) where.unidade_ID = unidade_ID;
      if (prioridade) where.prioridade_code = prioridade;

      const recs = await db.run(SELECT.from('myfranchise.Recomendacoes').where(where).orderBy('prioridade_code'));

      const unids = await db.run(SELECT.from('myfranchise.Unidades').columns('ID','nome','cidade'));
      const unidMap = {};
      unids.forEach(u => { unidMap[u.ID] = u; });

      const resultado = recs.map(r => ({
        id: r.ID,
        loja: unidMap[r.unidade_ID]?.nome || r.unidade_ID,
        cidade: unidMap[r.unidade_ID]?.cidade,
        tipo: r.tipo_code,
        prioridade: r.prioridade_code,
        titulo: r.titulo,
        descricao: r.descricao,
        status: r.status_code,
        geradaEm: r.dataGeracao,
      }));

      return ok({ total: resultado.length, recomendacoes: resultado });
    } catch (e) {
      LOG.error('get_recomendacoes', e);
      return err(e.message);
    }
  }
);

// ── TOOL 5: score de saúde da rede ──────────────────────────────
server.tool(
  'get_score_rede',
  'Retorna o score de saúde das lojas da rede com filtros opcionais por região, cluster ou criticidade.',
  {
    regiao_code:   z.enum(['N','NE','CO','SE','S']).optional(),
    cluster_code:  z.string().optional().describe('Cluster da loja (ex: STD, EXP, FLG)'),
    criticidade:   z.number().int().min(1).max(3).optional().describe('1=crítico, 2=atenção, 3=saudável'),
    top:           z.number().int().min(1).max(50).default(10).describe('Número máximo de lojas a retornar'),
  },
  async ({ regiao_code, cluster_code, criticidade, top }) => {
    try {
      const db = await cds.connect.to('db');
      const rows = await db.run(SELECT.from('myfranchise.Saude_Dashboard'));

      let filtradas = rows;
      if (regiao_code) filtradas = filtradas.filter(r => r.regiao_code === regiao_code);
      if (cluster_code) filtradas = filtradas.filter(r => r.cluster_code === cluster_code);
      if (criticidade) filtradas = filtradas.filter(r => r.scoreCriticality === criticidade);

      filtradas.sort((a, b) => a.scoreSaude - b.scoreSaude);

      const resumo = {
        total: filtradas.length,
        criticas: rows.filter(r => r.scoreCriticality === 1).length,
        atencao:  rows.filter(r => r.scoreCriticality === 2).length,
        saudaveis:rows.filter(r => r.scoreCriticality === 3).length,
        scoreMedia: rows.length ? Math.round(rows.reduce((s,r) => s + Number(r.scoreSaude||0), 0) / rows.length * 10) / 10 : 0,
      };

      const lojas = filtradas.slice(0, top).map(r => ({
        loja: r.nome,
        cidade: r.cidade,
        regiao: r.regiao_code,
        cluster: r.cluster_code,
        score: r.scoreSaude,
        compliance: r.compliancePct,
        performance: r.performancePct,
        alertasAlta: r.qtdAlertasAlta,
        criticidade: r.scoreCriticality === 1 ? 'CRÍTICO' : r.scoreCriticality === 2 ? 'ATENÇÃO' : 'SAUDÁVEL',
      }));

      return ok({ resumo_rede: resumo, lojas });
    } catch (e) {
      LOG.error('get_score_rede', e);
      return err(e.message);
    }
  }
);

// ── TOOL 6: acionar agente de reposição ─────────────────────────
server.tool(
  'acionar_reposicao',
  'Aciona o Agente de Reposição para uma loja específica. ' +
  'O agente detecta itens em risco de ruptura, calcula quantidades com sazonalidade regional e gera Pedidos_Reposicao em status PENDENTE para aprovação humana.',
  {
    unidade_ID: z.string().describe('ID da loja (ex: u178)'),
  },
  async ({ unidade_ID }) => {
    try {
      const { gerarParaUnidade } = require('./ai/reposicao-agent');
      const csn = await cds.load('srv/csn.json');
      cds.model = cds.linked(csn);
      await cds.connect.to('db');
      const srv = await cds.serve('FranqueadoraService').from(csn);

      const resultado = await gerarParaUnidade(srv, unidade_ID);

      return ok({
        unidade_ID,
        pedidosGerados: resultado.count,
        modo: resultado.modo,
        mensagem: resultado.count > 0
          ? `${resultado.count} pedido(s) de reposição criados em status PENDENTE via ${resultado.modo}. Aguardando aprovação do gestor.`
          : 'Nenhum item em risco de ruptura detectado para esta loja.',
      });
    } catch (e) {
      LOG.error('acionar_reposicao', e);
      return err(e.message);
    }
  }
);

// ── Express App ─────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'UP',
    service: 'runmyfranchise-mcp',
    version: '1.0.0',
    tools: [
      'get_lojas_em_risco',
      'get_cobertura_estoque',
      'get_pedidos_pendentes',
      'get_recomendacoes',
      'get_score_rede',
      'acionar_reposicao',
    ],
    mes_referencia: MES_REF,
    timestamp: new Date().toISOString(),
  });
});

app.all('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => `rmf-${Date.now()}`,
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    LOG.error('MCP transport error', e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

if (require.main === module) {
  cds.connect.to('db').then(() => {
    app.listen(PORT, () => {
      LOG.info(`RunMyFranchise MCP Server running on port ${PORT}`);
      LOG.info(`Health: http://localhost:${PORT}/health`);
      LOG.info(`MCP:    http://localhost:${PORT}/mcp`);
    });
  });
}

module.exports = { app, server };
