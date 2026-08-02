'use strict';
const cds = require('@sap/cds');
const LOG = cds.log('ai-reposicao');

/**
 * Agente de Reposição — evita ruptura de estoque na loja do franqueado.
 *
 * Considera SAZONALIDADE REGIONAL (a demanda de uma categoria varia por região e
 * mês — ex.: Sandálias/Havaianas em julho: alta no Nordeste, baixa no Sul) e o
 * CALENDÁRIO PROMOCIONAL (campanhas antecipam demanda).
 *
 * Dois modos (mesmo padrão do recommendations-job):
 *   1. GenAI Hub (gpt-4o) quando o AI Core está bound.
 *   2. Fallback determinístico por regras — garante a demo em qualquer ambiente.
 *
 * Nível de autonomia: gera PEDIDOS em status PENDENTE (human-in-the-loop) — a
 * aprovação é feita depois (via app / BPA).
 */

const STATUS_PEDIDO = ['PENDENTE', 'APROVADO', 'RECUSADO', 'ENVIADO', 'RECEBIDO'];

// Mês de referência da análise. Fixo para a demo (julho = mês-âncora das Havaianas).
// Em produção usar o mês corrente; mantido determinístico para a demo.
const MES_REFERENCIA = 7;

function aiCoreDisponivel() {
  try {
    const vcap = JSON.parse(process.env.VCAP_SERVICES || '{}');
    return Boolean(vcap.aicore || vcap['aicore'] || vcap['ai-core']);
  } catch {
    return false;
  }
}

/**
 * Busca o fator sazonal (categoria × região × mês). 1.0 se não houver registro.
 */
async function fatorSazonal(srv, categoria, regiaoCode, mes) {
  if (!categoria || !regiaoCode) return 1.0;
  const row = await SELECT.one.from('myfranchise.Sazonalidade_Regional').where({
    categoria, regiao_code: regiaoCode, mes
  });
  return row ? Number(row.fatorDemanda) : 1.0;
}

/**
 * Uplift do calendário promocional para a categoria/região no mês. 1.0 se nenhuma campanha.
 * (Simplificado para a demo: considera campanha ativa cujo mês de início = mês de referência.)
 */
async function upliftPromocional(srv, categoria, regiaoCode, mes) {
  if (!categoria) return 1.0;
  const camps = await SELECT.from('myfranchise.Calendario_Promocional').where({ categoria, ativa: true });
  let uplift = 1.0;
  for (const c of camps) {
    const inicioMes = c.dataInicio ? new Date(c.dataInicio).getUTCMonth() + 1 : null;
    const mesmaRegiao = !c.regiao_code || c.regiao_code === regiaoCode;
    if (mesmaRegiao && inicioMes === mes) uplift = Math.max(uplift, Number(c.upliftDemanda) || 1.0);
  }
  return uplift;
}

/**
 * Enriquece linhas de Estoque_Unidade com coberturaDias e estoqueCriticality,
 * ajustando o giro pela sazonalidade regional + campanhas.
 * Chamado no after('READ', Estoque_Unidade).
 */
async function enriquecerEstoque(srv, rows) {
  for (const r of rows) {
    if (!r || r.giroMedioDiario == null) continue;

    // região da unidade
    let regiaoCode = r.regiaoCode;
    if (!regiaoCode && r.unidade_ID) {
      const u = await SELECT.one.from('myfranchise.Unidades').where({ ID: r.unidade_ID });
      regiaoCode = u?.regiao_code;
    }

    const fator = await fatorSazonal(srv, r.categoria, regiaoCode, MES_REFERENCIA);
    const uplift = await upliftPromocional(srv, r.categoria, regiaoCode, MES_REFERENCIA);
    const demandaDiaria = Number(r.giroMedioDiario) * fator * uplift;

    const cobertura = demandaDiaria > 0
      ? Math.round((Number(r.saldoAtual) / demandaDiaria) * 10) / 10
      : 999;
    r.coberturaDias = cobertura;

    // Criticality: vermelho se a cobertura não cobre o lead time (vai romper antes de repor);
    // amarelo se cobre o lead time mas está abaixo de 1.5× (margem apertada); verde caso contrário.
    const lead = Number(r.leadTimeDias) || 0;
    if (cobertura < lead)            r.estoqueCriticality = 1; // RUPTURA iminente
    else if (cobertura < lead * 1.5) r.estoqueCriticality = 2; // ATENÇÃO
    else                             r.estoqueCriticality = 3; // OK
  }
}

/**
 * Monta o contexto de risco de uma unidade (itens em risco de ruptura).
 */
async function montarContexto(srv, unidadeId) {
  const { Unidades, Estoque_Unidade } = srv.entities;
  const unidade = await SELECT.one.from(Unidades).where({ ID: unidadeId });
  if (!unidade) return null;

  const estoque = await SELECT.from(Estoque_Unidade).where({ unidade_ID: unidadeId });
  // anota a região para o cálculo e enriquece (cobertura + criticality)
  for (const e of estoque) e.regiaoCode = unidade.regiao_code;
  await enriquecerEstoque(srv, estoque);

  const emRisco = estoque.filter(e => e.estoqueCriticality === 1 || e.estoqueCriticality === 2);
  return { unidade, emRisco };
}

/**
 * Calcula a quantidade sugerida de reposição:
 * cobre o lead time + um colchão de segurança, na demanda AJUSTADA (sazonal).
 * qtd = ceil(demandaDiaria × (leadTime + diasSeguranca)) − saldoAtual
 */
function calcularQuantidade(item, diasSeguranca = 15) {
  const demandaDiaria = Number(item.giroMedioDiario) * (item._fatorTotal || 1);
  const alvo = Math.ceil(demandaDiaria * ((Number(item.leadTimeDias) || 0) + diasSeguranca));
  const qtd = Math.max(alvo - Number(item.saldoAtual), 0);
  return qtd;
}

// ───────────────────────────────────────────────────────────
// MODO 1 — GenAI Hub (gpt-4o)
// ───────────────────────────────────────────────────────────
async function gerarViaGenAIHub(ctx) {
  const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');
  const client = new OrchestrationClient({
    promptTemplating: {
      model: { name: 'gpt-4o', params: { max_tokens: 900, temperature: 0.3 } },
      prompt: { template: [{ role: 'user', content: '{{?prompt}}' }] }
    }
  });
  const response = await client.chatCompletion({
    placeholderValues: { prompt: montarPrompt(ctx) }
  });
  return parsePedidos(response.getContent());
}

function montarPrompt(ctx) {
  const { unidade, emRisco } = ctx;
  const lista = emRisco.map(e =>
    `${e.nomeProduto} (SKU ${e.sku}, categoria ${e.categoria}): saldo ${e.saldoAtual}, ` +
    `cobertura ${e.coberturaDias} dias, lead time ${e.leadTimeDias} dias`
  ).join('; ');

  return `Você é um agente de reposição de estoque de uma rede de franquias.
A loja "${unidade.nome}" (região ${unidade.regiao_code}) tem os seguintes itens em risco de ruptura,
já considerando a sazonalidade regional do mês: ${lista}.

Para CADA item, gere um pedido de reposição. Responda APENAS com um array JSON válido, sem texto adicional:
[{ "sku": "...", "nomeProduto": "...", "qtdSugerida": <inteiro>, "fornecedorSugerido": "...", "justificativa": "...", "urgencia": "ALTA|MEDIA|BAIXA" }]

Na justificativa, seja específico: cite o saldo, a cobertura em dias, e por que a reposição é urgente
(ex.: sazonalidade da região, campanha ativa). A quantidade deve cobrir o lead time com folga de segurança.`;
}

function parsePedidos(content) {
  try {
    const match = content.match(/\[[\s\S]*\]/);
    const arr = JSON.parse(match ? match[0] : content);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    LOG.warn('Falha ao parsear resposta do LLM — usando fallback', e.message);
    return null;
  }
}

// ───────────────────────────────────────────────────────────
// MODO 2 — Fallback por regras
// ───────────────────────────────────────────────────────────
function gerarViaRegras(ctx) {
  const { unidade, emRisco } = ctx;
  return emRisco.map(e => {
    const qtd = calcularQuantidade(e);
    const urgente = e.estoqueCriticality === 1;
    return {
      sku: e.sku,
      nomeProduto: e.nomeProduto,
      qtdSugerida: qtd,
      fornecedorSugerido: 'Centro de Distribuição Regional',
      justificativa: `A loja ${unidade.nome} (região ${unidade.regiao_code}) tem apenas ${e.saldoAtual} ` +
        `unidades de ${e.nomeProduto}, cobertura de ${e.coberturaDias} dias — ${urgente ? 'abaixo' : 'próxima'} ` +
        `do lead time de reposição (${e.leadTimeDias} dias). Considerando a sazonalidade da região no período, ` +
        `a demanda está elevada. Repor ${qtd} unidades para evitar ruptura e venda perdida.`,
      urgencia: urgente ? 'ALTA' : 'MEDIA'
    };
  });
}

function urgenciaCrit(u) {
  return u === 'ALTA' ? 1 : u === 'MEDIA' ? 2 : 3;
}

/**
 * Gera pedidos de reposição para UMA unidade e persiste (status PENDENTE).
 * Substitui os pedidos PENDENTES anteriores (evita acúmulo ao reexecutar).
 */
async function gerarParaUnidade(srv, unidadeId) {
  const { Pedidos_Reposicao } = srv.entities;
  const ctx = await montarContexto(srv, unidadeId);
  if (!ctx) { LOG.warn(`Unidade ${unidadeId} não encontrada`); return { count: 0, modo: 'n/a' }; }
  if (!ctx.emRisco.length) { LOG.info(`Unidade ${ctx.unidade.nome}: sem itens em risco`); return { count: 0, modo: 'sem risco' }; }

  // guarda o fator total para o cálculo de quantidade do fallback
  for (const e of ctx.emRisco) {
    const demandaBase = Number(e.giroMedioDiario);
    e._fatorTotal = demandaBase > 0 && e.coberturaDias > 0
      ? (Number(e.saldoAtual) / e.coberturaDias) / demandaBase
      : 1;
  }

  let brutos, modo;
  if (aiCoreDisponivel()) {
    try {
      brutos = await gerarViaGenAIHub(ctx);
      modo = 'GenAI Hub';
      if (!brutos) { brutos = gerarViaRegras(ctx); modo = 'regras (fallback pós-parse)'; }
    } catch (e) {
      LOG.warn(`GenAI Hub falhou (${e.message}) — usando fallback`);
      brutos = gerarViaRegras(ctx);
      modo = 'regras (fallback pós-erro)';
    }
  } else {
    brutos = gerarViaRegras(ctx);
    modo = 'regras (sem AI Core)';
  }

  LOG.info(`Unidade ${ctx.unidade.nome}: ${brutos.length} pedidos de reposição (${modo})`);

  const agora = new Date();
  const prazo = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 dias
  const entries = brutos.map(p => ({
    unidade_ID: unidadeId,
    sku: String(p.sku || '').slice(0, 50),
    nomeProduto: String(p.nomeProduto || '').slice(0, 150),
    qtdSugerida: Number(p.qtdSugerida) || 0,
    justificativa: String(p.justificativa || '').slice(0, 2000),
    fornecedorSugerido: String(p.fornecedorSugerido || '').slice(0, 150),
    prazoDesejado: prazo.toISOString().slice(0, 10),
    status_code: 'PENDENTE',
    origem_code: 'AGENTE'
  }));

  // substitui pedidos PENDENTES anteriores desta unidade (não mexe nos já aprovados/enviados)
  await DELETE.from(Pedidos_Reposicao).where({ unidade_ID: unidadeId, status_code: 'PENDENTE', origem_code: 'AGENTE' });
  await INSERT.into(Pedidos_Reposicao).entries(entries);
  return { count: entries.length, modo };
}

/**
 * Gera reposição para todas as unidades ativas.
 */
async function gerarParaTodas(srv) {
  const { Unidades } = srv.entities;
  const unidades = await SELECT.from(Unidades).where({ status_code: 'ATIVA' });
  let totalPedidos = 0;
  const modos = new Set();
  for (const u of unidades) {
    const r = await gerarParaUnidade(srv, u.ID);
    totalPedidos += r.count;
    if (r.count) modos.add(r.modo);
  }
  const modo = modos.has('GenAI Hub')
    ? (modos.size > 1 ? 'misto (IA + fallback)' : 'GenAI Hub')
    : 'regras (fallback)';
  return { unidades: unidades.length, pedidos: totalPedidos, modo };
}

module.exports = { enriquecerEstoque, gerarParaUnidade, gerarParaTodas, aiCoreDisponivel };
