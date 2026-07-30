'use strict';
const cds = require('@sap/cds');

module.exports = class FranqueadoraService extends cds.ApplicationService {

  async init() {
    const {
      VendaPraticada, KPI_Unidade,
      ItensCatalogo, RegrasCompliance,
      Desvios, Saude_Unidade,
      Unidades, Contratos_Franquia
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

    return super.init();
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
