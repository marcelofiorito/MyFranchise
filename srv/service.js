'use strict';
const cds = require('@sap/cds');
const recommendations = require('./ai/recommendations-job');
const reposicao = require('./ai/reposicao-agent');

module.exports = class FranqueadoraService extends cds.ApplicationService {

  async init() {
    const {
      VendaPraticada, KPI_Unidade,
      ItensCatalogo, RegrasCompliance,
      Desvios, Saude_Unidade,
      Unidades, Contratos_Franquia,
      Estoque_Unidade
    } = this.entities;

    // Detecção automática de desvios após nova venda registrada
    // CAP 10: after-handler recebe (results, req) — req.data contém os dados inseridos
    this.after('CREATE', VendaPraticada, async (results, req) => {
      const data = req.data;
      await this._detectarDesvios(data, { ItensCatalogo, RegrasCompliance, Desvios });
      await this._recalcularSaude(data.unidade_ID, { KPI_Unidade, Desvios, Unidades, Contratos_Franquia, Saude_Unidade });
    });

    // Recalcula score quando KPI é atualizado
    this.after('CREATE', KPI_Unidade, async (results, req) => {
      await this._recalcularSaude(req.data.unidade_ID, { KPI_Unidade, Desvios, Unidades, Contratos_Franquia, Saude_Unidade });
    });
    this.after('UPDATE', KPI_Unidade, async (results, req) => {
      await this._recalcularSaude(req.data.unidade_ID, { KPI_Unidade, Desvios, Unidades, Contratos_Franquia, Saude_Unidade });
    });

    // Gera o código da unidade automaticamente (padrão uXXXX) quando não informado
    this.before('CREATE', Unidades, async (req) => {
      if (!req.data.codigo) {
        req.data.codigo = await this._proximoCodigoUnidade(Unidades);
      }
    });

    // Ações de IA — geração de recomendações (AI Core/GenAI Hub ou fallback)
    this.on('gerarRecomendacoes', async (req) => {
      const { unidade_ID } = req.data;
      const { count, modo } = await recommendations.gerarParaUnidade(this, unidade_ID);
      return { unidade_ID, recomendacoes: count, modo };
    });

    this.on('gerarRecomendacoesTodas', async () => {
      return await recommendations.gerarParaTodas(this);
    });

    // Estoque: calcula coberturaDias + estoqueCriticality considerando a
    // sazonalidade regional da unidade (demanda ajustada = giro × fator sazonal).
    // O before garante que as colunas-base entrem no $select (o FE pede só as
    // colunas visíveis; sem os campos-base o cálculo não teria dados).
    this.before('READ', Estoque_Unidade, (req) => {
      // Não adicionar colunas em requisições $count — o HANA rejeita
      // colunas não-agregadas em GROUP BY de COUNT queries.
      if (req._.req?.path?.endsWith('/$count') || req.query?.SELECT?.one) return;
      const cols = req.query?.SELECT?.columns;
      if (Array.isArray(cols)) {
        const nomes = new Set(cols.map(c => c.ref?.[c.ref.length - 1]).filter(Boolean));
        for (const base of ['saldoAtual', 'giroMedioDiario', 'leadTimeDias', 'categoria', 'unidade_ID']) {
          if (!nomes.has(base)) cols.push({ ref: [base] });
        }
      }
    });
    this.after('READ', Estoque_Unidade, async (rows) => {
      if (!rows || typeof rows === 'number' || (Array.isArray(rows) && rows.length === 0)) return;
      await reposicao.enriquecerEstoque(this, Array.isArray(rows) ? rows : [rows]);
    });

    // Agente de Reposição — detecta risco de ruptura e gera pedidos (gpt-4o + fallback)
    this.on('gerarReposicao', async (req) => {
      const { unidade_ID } = req.data;
      const { count, modo } = await reposicao.gerarParaUnidade(this, unidade_ID);
      return { unidade_ID, pedidos: count, modo };
    });

    this.on('gerarReposicaoTodas', async () => {
      return await reposicao.gerarParaTodas(this);
    });

    this.on('rupturaCount', async () => {
      const db = await cds.connect.to('db');
      const [{ CNT }] = await db.run(
        `SELECT COUNT(*) CNT FROM MYFRANCHISE_ESTOQUE_UNIDADE WHERE STATUS_CODE='RUPTURA'`
      );
      return CNT;
    });

    this.on('pedidosPendentesCount', async () => {
      const db = await cds.connect.to('db');
      const [{ CNT }] = await db.run(
        `SELECT COUNT(*) CNT FROM MYFRANCHISE_PEDIDOS_REPOSICAO WHERE STATUS_CODE='PENDENTE'`
      );
      return CNT;
    });

    this.on('resetarDemo', async () => {
      const { Pedidos_Reposicao } = this.entities;
      // Volta todos os pedidos APROVADO/RECUSADO/ENVIADO para PENDENTE
      // e limpa os campos de decisão — preserva os dados do agente
      await UPDATE(Pedidos_Reposicao)
        .set({
          status_code : 'PENDENTE',
          qtdAprovada : null,
          aprovador   : null,
          dataDecisao : null,
        })
        .where(`status_code != 'PENDENTE'`);
      const [{ CNT }] = await cds.run(
        `SELECT COUNT(*) CNT FROM MYFRANCHISE_PEDIDOS_REPOSICAO WHERE STATUS_CODE='PENDENTE'`
      );
      return { pedidos: Number(CNT), mensagem: `Demo resetada — ${CNT} pedidos voltaram a PENDENTE.` };
    });

    this.on('simularRecebimento', async () => {
      const { Pedidos_Reposicao, Estoque_Unidade } = this.entities;
      const pedidos = await SELECT.from(Pedidos_Reposicao).where({ status_code: 'APROVADO' });
      if (!pedidos.length) return { pedidos: 0, mensagem: 'Nenhum pedido APROVADO para simular.' };
      for (const p of pedidos) {
        const qtd = p.qtdAprovada || p.qtdSugerida || 0;
        if (qtd) {
          const item = await SELECT.one.from(Estoque_Unidade)
            .where({ unidade_ID: p.unidade_ID, sku: p.sku });
          if (item) {
            const novoSaldo = (item.saldoAtual || 0) + qtd;
            const novoStatus = novoSaldo >= item.estoqueMinimo ? 'OK'
              : novoSaldo >= item.estoqueMinimo * 0.5 ? 'ATENCAO' : 'RUPTURA';
            await UPDATE(Estoque_Unidade)
              .set({ saldoAtual: novoSaldo, status_code: novoStatus })
              .where({ ID: item.ID });
          }
        }
        await UPDATE(Pedidos_Reposicao)
          .set({ status_code: 'RECEBIDO', dataDecisao: new Date().toISOString() })
          .where({ ID: p.ID });
      }
      return { pedidos: pedidos.length, mensagem: `${pedidos.length} pedidos RECEBIDOS e estoque reposto.` };
    });

    const { Pedidos_Reposicao } = this.entities;

    this.on('aprovar', Pedidos_Reposicao, async (req) => {
      const pedido_ID = req.params[0].ID ?? req.params[0];
      const { qtdAprovada, observacao } = req.data;
      const pedido = await SELECT.one.from(Pedidos_Reposicao).where({ ID: pedido_ID });
      if (!pedido) return req.error(404, `Pedido não encontrado`);
      if (pedido.status_code !== 'PENDENTE') return req.error(409, `Pedido já está com status ${pedido.status_code}`);
      await UPDATE(Pedidos_Reposicao).set({
        status_code : 'APROVADO',
        qtdAprovada : qtdAprovada ?? pedido.qtdSugerida,
        aprovador   : req.user?.id ?? 'gestor',
        dataDecisao : new Date().toISOString()
      }).where({ ID: pedido_ID });
      return { status: 'APROVADO', mensagem: observacao ?? `Aprovado — qtd: ${qtdAprovada ?? pedido.qtdSugerida}` };
    });

    this.on('recusar', Pedidos_Reposicao, async (req) => {
      const pedido_ID = req.params[0].ID ?? req.params[0];
      const { motivo } = req.data;
      const pedido = await SELECT.one.from(Pedidos_Reposicao).where({ ID: pedido_ID });
      if (!pedido) return req.error(404, `Pedido não encontrado`);
      if (pedido.status_code !== 'PENDENTE') return req.error(409, `Pedido já está com status ${pedido.status_code}`);
      await UPDATE(Pedidos_Reposicao).set({
        status_code  : 'RECUSADO',
        aprovador    : req.user?.id ?? 'gestor',
        dataDecisao  : new Date().toISOString(),
        justificativa: `[RECUSADO] ${motivo ?? ''}\n\n${pedido.justificativa ?? ''}`
      }).where({ ID: pedido_ID });
      return { status: 'RECUSADO', mensagem: motivo ?? 'Recusado pelo gestor' };
    });

    return super.init();
  }

  /**
   * Gera o próximo código de unidade no padrão uXXXX (u0001, u0002, ...).
   *
   * ⚠️ IMPLEMENTAÇÃO DEV (opção B): lê o maior código atual e incrementa.
   * Funciona em SQLite e é suficiente para desenvolvimento/demo, MAS em
   * ambiente multi-instância (Cloud Foundry) duas instâncias podem ler o
   * mesmo "último" e gerar códigos duplicados.
   *
   * 🔻 TROCAR NA MIGRAÇÃO PARA HANA:
   *   Substituir por uma SEQUENCE nativa do HANA para garantir unicidade
   *   sob concorrência. Exemplo:
   *     -- db/src/unidade-seq.hdbsequence  (ou via CREATE SEQUENCE)
   *     CREATE SEQUENCE MYFRANCHISE_UNIDADE_SEQ START WITH 1000 INCREMENT BY 1;
   *   E no handler:
   *     const [{ NEXT }] = await cds.run(
   *       `SELECT MYFRANCHISE_UNIDADE_SEQ.NEXTVAL AS NEXT FROM DUMMY`);
   *     return 'u' + String(NEXT).padStart(4, '0');
   *   A sequence do banco é atômica — elimina o risco de colisão.
   */
  async _proximoCodigoUnidade(Unidades) {
    // Busca o maior código no padrão uXXXX (ignora códigos legados como "147")
    const unidades = await SELECT.from(Unidades).columns('codigo');
    let maxNum = 0;
    for (const u of unidades) {
      const m = /^u(\d+)$/.exec(u.codigo ?? '');
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return 'u' + String(maxNum + 1).padStart(4, '0');
  }


  async _detectarDesvios(venda, { ItensCatalogo, RegrasCompliance, Desvios }) {
    const itemCatalogo = await SELECT.one(ItensCatalogo)
      .where({ sku: venda.sku, ativo: true });

    if (!itemCatalogo) {
      // SKU fora do catálogo = desvio de Mix
      await INSERT.into(Desvios).entries({
        unidade_ID:       venda.unidade_ID,
        tipo_code:        'MIX',
        sku:              venda.sku,
        nomeProduto:      venda.nomeProduto,
        precoPraticado:   venda.precoPraticado,
        percentualDesvio: 0,
        severidade_code:  'ALTA',
        status_code:      'ABERTO',
        dataDeteccao:     new Date().toISOString()
      });
      return;
    }

    const dentro = venda.precoPraticado >= itemCatalogo.precoMinimo
                && venda.precoPraticado <= itemCatalogo.precoMaximo;
    if (dentro) return;

    const pct = Math.abs(
      (venda.precoPraticado - itemCatalogo.precoSugerido) / itemCatalogo.precoSugerido * 100
    );

    const regra = await SELECT.one(RegrasCompliance)
      .where({ tipo_code: 'PRECO', ativa: true });

    const limiarAlta  = regra?.limiarAlta_pct  ?? 15;
    const limiarMedia = regra?.limiarMedia_pct ?? 5;
    const severidade  = pct >= limiarAlta  ? 'ALTA'
                      : pct >= limiarMedia ? 'MEDIA'
                      : 'BAIXA';

    await INSERT.into(Desvios).entries({
      unidade_ID:       venda.unidade_ID,
      tipo_code:        'PRECO',
      sku:              venda.sku,
      nomeProduto:      venda.nomeProduto,
      precoAutorizado:  itemCatalogo.precoSugerido,
      precoPraticado:   venda.precoPraticado,
      percentualDesvio: parseFloat(pct.toFixed(2)),
      severidade_code:  severidade,
      status_code:      'ABERTO',
      dataDeteccao:     new Date().toISOString()
    });
  }

  async _recalcularSaude(unidadeId, { KPI_Unidade, Desvios, Unidades, Contratos_Franquia, Saude_Unidade }) {
    const unidade = await SELECT.one(Unidades).where({ ID: unidadeId });
    if (!unidade) return;

    // Último KPI disponível
    const kpis = await SELECT.from(KPI_Unidade)
      .where({ unidade_ID: unidadeId })
      .orderBy('periodo desc')
      .limit(1);
    const kpi = kpis[0];

    // Benchmark do cluster
    const { Benchmark_Cluster } = this.entities;
    const benchmarks = await SELECT.from(Benchmark_Cluster)
      .where({ cluster_code: unidade.cluster_code })
      .orderBy('periodo desc')
      .limit(1);
    const benchmark = benchmarks[0];

    const performancePct = benchmark?.faturamentoMedio > 0 && kpi?.faturamento
      ? Math.min((kpi.faturamento / benchmark.faturamentoMedio) * 100, 100)
      : 50;

    // Contrato ativo
    const contratos = await SELECT.from(Contratos_Franquia)
      .where({ unidade_ID: unidadeId })
      .orderBy('dataVencimento desc')
      .limit(1);
    const contrato = contratos[0];
    const scoreContrato =
      contrato?.status_code === 'ATIVO'             ? 100 :
      contrato?.status_code === 'VENCENDOEM90DIAS'  ? 60  :
      contrato?.status_code === 'VENCENDOEM30DIAS'  ? 30  : 0;

    // Desvios abertos
    const desviosAbertos = await SELECT.from(Desvios)
      .where({ unidade_ID: unidadeId, status_code: { in: ['ABERTO', 'NOTIFICADO'] } });

    const compliancePct = Math.max(0, 100 - (desviosAbertos.length * 12));

    const scoreSaude = parseFloat(
      ((performancePct * 0.40) + (compliancePct * 0.40) + (scoreContrato * 0.20)).toFixed(2)
    );

    const qtdAlertasAlta  = desviosAbertos.filter(d => d.severidade_code === 'ALTA').length;
    const qtdAlertasMedia = desviosAbertos.filter(d => d.severidade_code === 'MEDIA').length;

    const scoreCriticality = scoreSaude < 45 ? 1 : scoreSaude < 70 ? 2 : 3;

    // Verificar se já existe registro de saúde para esta unidade
    const existente = await SELECT.one(Saude_Unidade).where({ unidade_ID: unidadeId });

    if (existente) {
      await UPDATE(Saude_Unidade)
        .where({ unidade_ID: unidadeId })
        .with({
          scoreSaude, compliancePct, performancePct,
          qtdAlertasAlta, qtdAlertasMedia, scoreCriticality,
          dataAtualizacao: new Date().toISOString()
        });
    } else {
      await INSERT.into(Saude_Unidade).entries({
        unidade_ID: unidadeId,
        scoreSaude, compliancePct, performancePct,
        qtdAlertasAlta, qtdAlertasMedia, scoreCriticality,
        dataAtualizacao: new Date().toISOString()
      });
    }
  }
};
