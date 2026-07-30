using FranqueadoService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// PORTAL DO FRANQUEADO — Overview Page (OVP)
// 5 cards: KPIs, Score de Saúde, Desvios, Recomendações, Benchmark
// ─────────────────────────────────────────────────────────────

// ── Card 0: Minha Performance (chart de linha — faturamento 6 meses) ─
annotate service.MeusKPIs with @(

  UI.Chart #KPITrend: {
    Title              : '{i18n>lbl_franchisee_meuFaturamento}',
    ChartType          : #Line,
    Dimensions         : [periodo],
    DimensionAttributes: [{ Dimension: periodo, Role: #Category }],
    Measures           : [faturamento],
    MeasureAttributes  : [{ Measure: faturamento, Role: #Axis1 }]
  },

  UI.PresentationVariant #ByPeriod: {
    SortOrder     : [{ Property: periodo, Descending: false }],
    Visualizations: ['@UI.Chart#KPITrend']
  },

  UI.SelectionVariant #LastPeriod: {
    Text: '{i18n>lbl_franchisee_varUltimoPeriodo}'
  }
);

// ── Card 1: Score de Saúde (KPI card) ──────────────────────────
annotate service.MinhaSaude with @(

  UI.DataPoint #ScoreSaude: {
    Value              : scoreSaude,
    Title              : '{i18n>Saude_Unidade_scoreSaude}',
    Criticality        : scoreCriticality,
    CriticalityCalculation: {
      ImprovementDirection   : #Maximize,
      ToleranceRangeLowValue : 45,
      DeviationRangeLowValue : 0
    }
  },

  UI.SelectionVariant #Current: {
    Text: '{i18n>lbl_franchisee_varAtual}'
  }
);

// ── Card 2: Ações Pendentes (desvios abertos) ─────────────────
annotate service.MeusDesvios with @(

  UI.LineItem #Pendentes: [
    { Value: nomeProduto,      Label: '{i18n>Desvios_nomeProduto}'      },
    { Value: tipo_code,        Label: '{i18n>Alertas_tipo}'             },
    { Value: percentualDesvio, Label: '{i18n>Desvios_percentualDesvio}' },
    {
      Value      : severidade_code,
      Label      : '{i18n>Desvios_severidade}',
      Criticality: severidadeCriticality
    },
    { Value: dataDeteccao, Label: '{i18n>Desvios_dataDeteccao}' }
  ],

  UI.SelectionVariant #Abertos: {
    Text         : '{i18n>lbl_franchisee_varPendentes}',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [
        { Sign: #I, Option: #EQ, Low: 'ABERTO'     },
        { Sign: #I, Option: #EQ, Low: 'NOTIFICADO' }
      ]
    }]
  }
);

// ── Card 3: Recomendações do AI ───────────────────────────────
annotate service.MinhasRecomendacoes with @(

  UI.LineItem #Recomendacoes: [
    { Value: titulo,         Label: '{i18n>Recomendacoes}'             },
    { Value: tipo_code,      Label: '{i18n>Alertas_tipo}'              },
    { Value: prioridade_code,Label: '{i18n>Recomendacoes_prioridade}'  },
    { Value: dataGeracao,    Label: '{i18n>Recomendacoes_dataGeracao}' }
  ],

  UI.SelectionVariant #Novas: {
    Text         : '{i18n>lbl_franchisee_varNovas}',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [{ Sign: #I, Option: #EQ, Low: 'NOVA' }]
    }]
  }
);

// ── Card 4: Posição na Rede — Benchmark do cluster ────────────
annotate service.BenchmarkMeuCluster with @(

  UI.Chart #BenchmarkComparativo: {
    Title              : '{i18n>lbl_franchisee_chartBenchmark}',
    ChartType          : #Bar,
    Dimensions         : [periodo],
    DimensionAttributes: [{ Dimension: periodo, Role: #Category }],
    Measures           : [faturamentoMedio, ticketMedioMedio],
    MeasureAttributes  : [
      { Measure: faturamentoMedio,  Role: #Axis1 },
      { Measure: ticketMedioMedio,  Role: #Axis2 }
    ]
  },

  UI.PresentationVariant #ByPeriod: {
    SortOrder     : [{ Property: periodo, Descending: false }],
    Visualizations: ['@UI.Chart#BenchmarkComparativo']
  }
);
