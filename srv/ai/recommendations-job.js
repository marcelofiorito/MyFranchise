'use strict';
const cds = require('@sap/cds');
const LOG = cds.log('ai-recommendations');

/**
 * Job de geração de recomendações para franqueados.
 *
 * ARQUITETURA RESILIENTE (dois modos):
 *   1. GenAI Hub (produção): usa @sap-ai-sdk/orchestration quando o AI Core
 *      está bound (VCAP_SERVICES tem 'aicore'). Chama um LLM com prompt
 *      estruturado por unidade.
 *   2. Fallback baseado em regras (dev/demo): quando o AI Core não está
 *      disponível, gera recomendações determinísticas a partir dos mesmos
 *      dados (desvios, KPIs, benchmark). Garante que a demo funcione em
 *      qualquer ambiente, inclusive local com SQLite.
 *
 * A escolha do modo é automática — não precisa configurar nada em dev.
 */

const TIPOS = ['ESTOQUE', 'PRECIFICACAO', 'OPERACIONAL', 'TREINAMENTO', 'CAMPANHA'];
const PRIORIDADES = ['ALTA', 'MEDIA', 'BAIXA'];

/**
 * Detecta se o AI Core está disponível (bound via VCAP_SERVICES).
 */
function aiCoreDisponivel() {
  try {
    const vcap = JSON.parse(process.env.VCAP_SERVICES || '{}');
    return Boolean(vcap.aicore || vcap['aicore'] || vcap['ai-core']);
  } catch {
    return false;
  }
}

/**
 * Monta o prompt estruturado para o LLM a partir dos dados da unidade.
 */
function montarPrompt(ctx) {
  const { unidade, kpi, benchmark, desvios } = ctx;
  const listaDesvios = desvios.length
    ? desvios.map(d => `${d.nomeProduto} (${d.tipo_code}, ${d.severidade_code})`).join('; ')
    : 'nenhum';

  return `Você é um consultor sênior de redes de franquias. Com base nos dados abaixo,
gere exatamente 3 recomendações práticas e priorizadas para o franqueado melhorar sua performance.

Unidade: ${unidade.nome} | Cluster: ${unidade.cluster_code} | Cidade: ${unidade.cidade}
Faturamento último período: R$ ${kpi?.faturamento ?? 'N/D'} (média do cluster: R$ ${benchmark?.faturamentoMedio ?? 'N/D'})
NPS: ${kpi?.nps ?? 'N/D'} (média do cluster: ${benchmark?.npsMedio ?? 'N/D'})
Desvios de compliance abertos: ${listaDesvios}

Responda APENAS com um array JSON válido, sem texto adicional:
[{ "tipo": "...", "titulo": "...", "descricao": "...", "prioridade": "..." }]

Valores permitidos:
  tipo: ${TIPOS.join(' | ')}
  prioridade: ${PRIORIDADES.join(' | ')}`;
}

/**
 * MODO 1 — GenAI Hub via SAP AI SDK.
 * Só é chamado quando aiCoreDisponivel() === true.
 */
async function gerarViaGenAIHub(ctx) {
  // Import dinâmico: o SDK só é exigido quando realmente usado (produção).
  // Evita erro de dependência ausente em dev.
  const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');

  const client = new OrchestrationClient({
    llm: {
      model_name: 'gpt-4o',
      model_params: { max_tokens: 800, temperature: 0.4 }
    },
    templating: {
      template: [{ role: 'user', content: '{{?prompt}}' }]
    }
  });

  const response = await client.chatCompletion({
    inputParams: { prompt: montarPrompt(ctx) }
  });

  const content = response.getContent();
  return parseRecomendacoes(content);
}

/**
 * MODO 2 — Fallback baseado em regras (sem LLM).
 * Gera recomendações determinísticas a partir dos dados reais da unidade.
 */
function gerarViaRegras(ctx) {
  const { kpi, benchmark, desvios } = ctx;
  const recs = [];

  // Regra 1: desvios de preço → recomendação de precificação (ALTA)
  const desviosPreco = desvios.filter(d => d.tipo_code === 'PRECO');
  if (desviosPreco.length) {
    const produtos = desviosPreco.map(d => d.nomeProduto).slice(0, 3).join(', ');
    recs.push({
      tipo: 'PRECIFICACAO',
      titulo: `Corrigir precificação de ${desviosPreco.length} produto(s)`,
      descricao: `Foram detectados desvios de preço em: ${produtos}. Alinhe os preços praticados à tabela autorizada para evitar penalidades de compliance e proteger a margem da rede.`,
      prioridade: 'ALTA'
    });
  }

  // Regra 2: desvios de mix → recomendação operacional (ALTA)
  const desviosMix = desvios.filter(d => d.tipo_code === 'MIX');
  if (desviosMix.length) {
    recs.push({
      tipo: 'OPERACIONAL',
      titulo: 'Remover produtos não autorizados do mix',
      descricao: `Há ${desviosMix.length} item(ns) fora do catálogo aprovado sendo comercializado(s). Regularize o mix de produtos conforme o catálogo vigente da franqueadora.`,
      prioridade: 'ALTA'
    });
  }

  // Regra 3: faturamento abaixo da média do cluster → campanha (MEDIA)
  if (kpi?.faturamento && benchmark?.faturamentoMedio && kpi.faturamento < benchmark.faturamentoMedio) {
    const gap = Math.round((1 - kpi.faturamento / benchmark.faturamentoMedio) * 100);
    recs.push({
      tipo: 'CAMPANHA',
      titulo: `Faturamento ${gap}% abaixo da média do cluster`,
      descricao: `Sua unidade fatura ${gap}% menos que a média do cluster. Considere uma campanha promocional local e revise o giro dos produtos de maior margem.`,
      prioridade: 'MEDIA'
    });
  }

  // Regra 4: NPS abaixo da média → treinamento (MEDIA)
  if (kpi?.nps && benchmark?.npsMedio && kpi.nps < benchmark.npsMedio) {
    recs.push({
      tipo: 'TREINAMENTO',
      titulo: 'NPS abaixo da média do cluster',
      descricao: `O NPS da unidade (${kpi.nps}) está abaixo da média do cluster (${benchmark.npsMedio}). Recomenda-se treinamento de atendimento e experiência do cliente para a equipe.`,
      prioridade: 'MEDIA'
    });
  }

  // Garante ao menos 1 recomendação (unidade saudável)
  if (!recs.length) {
    recs.push({
      tipo: 'OPERACIONAL',
      titulo: 'Manter o bom desempenho',
      descricao: 'A unidade está com indicadores saudáveis e sem desvios de compliance. Continue seguindo os padrões da rede e monitore os KPIs mensalmente.',
      prioridade: 'BAIXA'
    });
  }

  // Máximo de 3 recomendações
  return recs.slice(0, 3);
}

/**
 * Faz o parse tolerante da resposta do LLM (que pode vir com markdown fences).
 */
function parseRecomendacoes(content) {
  const limpo = String(content).replace(/```json/gi, '').replace(/```/g, '').trim();
  const arr = JSON.parse(limpo);
  if (!Array.isArray(arr)) throw new Error('Resposta do LLM não é um array');
  return arr.slice(0, 3);
}

/**
 * Normaliza um código para os valores permitidos da code list (uppercase + validação).
 */
function normalizarCodigo(valor, permitidos, fallback) {
  const up = String(valor || '').toUpperCase().trim();
  return permitidos.includes(up) ? up : fallback;
}

/**
 * Gera recomendações para UMA unidade e persiste em Recomendacoes.
 * Retorna o número de recomendações criadas.
 */
async function gerarParaUnidade(srv, unidadeId) {
  const { Unidades, KPI_Unidade, Benchmark_Cluster, Desvios, Recomendacoes } = srv.entities;

  const unidade = await SELECT.one.from(Unidades).where({ ID: unidadeId });
  if (!unidade) {
    LOG.warn(`Unidade ${unidadeId} não encontrada — pulando`);
    return 0;
  }

  const kpis = await SELECT.from(KPI_Unidade)
    .where({ unidade_ID: unidadeId }).orderBy('periodo desc').limit(1);
  const benchmarks = await SELECT.from(Benchmark_Cluster)
    .where({ cluster_code: unidade.cluster_code }).orderBy('periodo desc').limit(1);
  const desvios = await SELECT.from(Desvios)
    .where({ unidade_ID: unidadeId, status_code: { in: ['ABERTO', 'NOTIFICADO'] } });

  const ctx = { unidade, kpi: kpis[0], benchmark: benchmarks[0], desvios };

  // AI-FIRST: sempre tenta o GenAI Hub primeiro quando o AI Core está disponível.
  // O fallback por regras só entra se o AI Core não estiver bound OU se a chamada falhar.
  //
  // Modo estrito (STRICT_AI): quando ligado, uma falha do GenAI Hub PROPAGA o erro
  // em vez de cair silenciosamente no fallback. Use em produção/demo para garantir
  // que você saiba se está realmente usando IA — evita apresentar regras como se
  // fossem IA sem perceber. Ligado via env AI_RECOMMENDATIONS_STRICT=true.
  const strict = String(process.env.AI_RECOMMENDATIONS_STRICT || '').toLowerCase() === 'true';

  let brutas;
  let modoUsado;
  if (aiCoreDisponivel()) {
    try {
      brutas = await gerarViaGenAIHub(ctx);
      modoUsado = 'GenAI Hub';
    } catch (e) {
      if (strict) {
        LOG.error(`GenAI Hub falhou para ${unidade.nome} e STRICT_AI está ligado — abortando`, e);
        throw new Error(`Geração via GenAI Hub falhou (modo estrito): ${e.message}`);
      }
      LOG.warn(`GenAI Hub falhou para ${unidadeId} (${e.message}) — usando fallback por regras`);
      brutas = gerarViaRegras(ctx);
      modoUsado = 'regras (fallback pós-erro)';
    }
  } else {
    if (strict) {
      LOG.error(`AI Core não está bound e STRICT_AI está ligado — abortando ${unidade.nome}`);
      throw new Error('AI Core não disponível (modo estrito exige GenAI Hub)');
    }
    brutas = gerarViaRegras(ctx);
    modoUsado = 'regras (sem AI Core)';
  }

  LOG.info(`Unidade ${unidade.nome}: ${brutas.length} recomendações (${modoUsado})`);

  const agora = new Date();
  const validade = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 dias

  const entries = brutas.map(r => ({
    unidade_ID:      unidadeId,
    tipo_code:       normalizarCodigo(r.tipo, TIPOS, 'OPERACIONAL'),
    titulo:          String(r.titulo || '').slice(0, 150),
    descricao:       String(r.descricao || '').slice(0, 2000),
    prioridade_code: normalizarCodigo(r.prioridade, PRIORIDADES, 'MEDIA'),
    status_code:     'NOVA',
    dataGeracao:     agora.toISOString(),
    dataValidade:    validade.toISOString()
  }));

  await INSERT.into(Recomendacoes).entries(entries);
  return { count: entries.length, modo: modoUsado };
}

/**
 * Job diário: gera recomendações para todas as unidades ativas.
 * Retorna resumo { unidades, recomendacoes, modo }.
 * O `modo` reportado reflete o que REALMENTE aconteceu:
 *   - 'GenAI Hub' se todas usaram IA
 *   - 'regras (fallback)' se nenhuma usou IA
 *   - 'misto (IA + fallback)' se houve mistura (ex: AI Core instável)
 */
async function gerarParaTodas(srv) {
  const { Unidades } = srv.entities;
  const unidades = await SELECT.from(Unidades).columns('ID');
  let total = 0;
  let usaramAI = 0;
  let usaramRegras = 0;
  for (const u of unidades) {
    const { count, modo } = await gerarParaUnidade(srv, u.ID);
    total += count;
    if (modo.startsWith('GenAI Hub')) usaramAI++;
    else usaramRegras++;
  }

  const modo = usaramAI && usaramRegras ? `misto (${usaramAI} IA + ${usaramRegras} regras)`
             : usaramAI                 ? 'GenAI Hub'
             :                            'regras (fallback)';
  LOG.info(`Job concluído: ${total} recomendações para ${unidades.length} unidades (modo: ${modo})`);
  return { unidades: unidades.length, recomendacoes: total, modo };
}

module.exports = { gerarParaUnidade, gerarParaTodas, aiCoreDisponivel };
