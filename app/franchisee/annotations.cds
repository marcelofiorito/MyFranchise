using FranqueadoService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// PORTAL DO FRANQUEADO — Overview Page (OVP)
// 5 cards: KPIs, Score de Saúde, Desvios, Recomendações, Benchmark
// ─────────────────────────────────────────────────────────────

// ── Card 0: Minha Performance (chart de linha — faturamento 6 meses) ─
annotate service.MeusKPIs with @(

  UI.Chart #KPITrend: {
    Title              : 'Meu Faturamento',
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
    Text: 'Último período'
  }
);

// ── Card 1: Score de Saúde (KPI card) ──────────────────────────
annotate service.MinhaSaude with @(

  UI.DataPoint #ScoreSaude: {
    Value              : scoreSaude,
    Title              : 'Score de Saúde',
    Criticality        : scoreCriticality,
    CriticalityCalculation: {
      ImprovementDirection   : #Maximize,
      ToleranceRangeLowValue : 45,
      DeviationRangeLowValue : 0
    }
  },

  UI.SelectionVariant #Current: {
    Text: 'Atual'
  }
);

// ── Card 2: Ações Pendentes (desvios abertos) ─────────────────
annotate service.MeusDesvios with @(

  UI.LineItem #Pendentes: [
    { Value: nomeProduto,      Label: 'Produto'       },
    { Value: tipo_code,        Label: 'Tipo'          },
    { Value: percentualDesvio, Label: 'Desvio %'      },
    {
      Value      : severidade_code,
      Label      : 'Severidade',
      Criticality: severidadeCriticality
    },
    { Value: dataDeteccao, Label: 'Detectado em' }
  ],

  UI.SelectionVariant #Abertos: {
    Text         : 'Pendentes',
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
    { Value: titulo,         Label: 'Recomendação' },
    { Value: tipo_code,      Label: 'Tipo'         },
    { Value: prioridade_code,Label: 'Prioridade'   },
    { Value: dataGeracao,    Label: 'Gerada em'    }
  ],

  UI.SelectionVariant #Novas: {
    Text         : 'Novas',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [{ Sign: #I, Option: #EQ, Low: 'NOVA' }]
    }]
  }
);

// ── Card 4: Posição na Rede — Benchmark do cluster ────────────
annotate service.BenchmarkMeuCluster with @(

  UI.Chart #BenchmarkComparativo: {
    Title              : 'Média do Cluster',
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
