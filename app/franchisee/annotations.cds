using FranqueadoService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// PORTAL DO FRANQUEADO — Overview Page (OVP)
// 5 cards: KPIs, Score de Saúde, Desvios, Recomendações, Benchmark
// ─────────────────────────────────────────────────────────────

// ── Card 0: Minha Performance (faturamento 6 meses) ─
annotate service.MeusKPIs with {
  faturamento @Measures.ISOCurrency: moeda;
  ticketMedio @Measures.ISOCurrency: moeda;
}
annotate service.MeusKPIs with @(

  UI.HeaderInfo: {
    TypeName      : '{i18n>KPI_Unidade_periodo}',
    TypeNamePlural: '{i18n>lbl_franchisee_meuFaturamento}',
    Title         : { Value: unidadeNome },
    Description   : { Value: unidadeCidade }
  },

  UI.PresentationVariant #ByPeriod: {
    SortOrder     : [{ Property: periodo, Descending: true }],
    Visualizations: ['@UI.LineItem#Trend']
  },

  UI.LineItem #Trend: [
    { Value: periodoLabel,   Label: '{i18n>KPI_Unidade_periodo}'        },
    { Value: faturamento,    Label: '{i18n>KPI_Unidade_faturamento}'    },
    { Value: ticketMedio,    Label: '{i18n>KPI_Unidade_ticketMedio}'    },
    { Value: crescimentoMoM, Label: '{i18n>KPI_Unidade_crescimentoMoM}' },
    { Value: nps,            Label: '{i18n>KPI_Unidade_nps}'            }
  ],

  UI.SelectionVariant #LastPeriod: {
    Text: '{i18n>lbl_franchisee_varUltimoPeriodo}'
  }
);

// ── Card 1: Score de Saúde (KPI card) ──────────────────────────
annotate service.MinhaSaude with @(

  UI.HeaderInfo: {
    TypeName      : '{i18n>Saude_Unidade_scoreSaude}',
    TypeNamePlural: '{i18n>Saude_Unidade_scoreSaude}',
    Title         : { Value: unidadeNome },
    Description   : { Value: unidadeCidade }
  },

  UI.DataPoint #ScoreSaude: {
    Value              : scoreSaude,
    Title              : '{i18n>Saude_Unidade_scoreSaude}',
    Criticality        : scoreCriticality
  },

  UI.LineItem #Saude: [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#ScoreSaude',
      Label : '{i18n>Saude_Unidade_scoreSaude}',
      ![@UI.Importance]: #High
    },
    { Value: compliancePct,  Label: '{i18n>Saude_Unidade_compliancePct}'  },
    { Value: performancePct, Label: '{i18n>Saude_Unidade_performancePct}' }
  ],

  UI.SelectionVariant #Current: {
    Text: '{i18n>lbl_franchisee_varAtual}'
  }
);

// ── Card 2: Ações Pendentes (desvios abertos) ─────────────────
annotate service.MeusDesvios with @(

  UI.DataPoint #Severidade: {
    Value      : severidade_code,
    Title      : '{i18n>Desvios_severidade}',
    Criticality: severidadeCrit
  },

  UI.LineItem #Pendentes: [
    { Value: nomeProduto,      Label: '{i18n>Desvios_nomeProduto}', ![@UI.Importance]: #High },
    { Value: tipo_code,        Label: '{i18n>Alertas_tipo}'             },
    { Value: percentualDesvio, Label: '{i18n>Desvios_percentualDesvio}' },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Severidade',
      Label : '{i18n>Desvios_severidade}',
      ![@UI.Importance]: #High
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

  UI.DataPoint #Prioridade: {
    Value      : prioridade_code,
    Title      : '{i18n>Recomendacoes_prioridade}',
    Criticality: prioridadeCrit
  },

  UI.LineItem #Recomendacoes: [
    { Value: titulo,      Label: '{i18n>Recomendacoes}', ![@UI.Importance]: #High },
    { Value: descricao,   Label: '{i18n>Recomendacoes_descricao}', ![@UI.Importance]: #High },
    { Value: tipo_code,   Label: '{i18n>Alertas_tipo}'  },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Prioridade',
      Label : '{i18n>Recomendacoes_prioridade}',
      ![@UI.Importance]: #High
    },
    { Value: dataGeracao, Label: '{i18n>Recomendacoes_dataGeracao}' }
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
annotate service.BenchmarkMeuCluster with {
  faturamentoMedio @Measures.ISOCurrency: moeda;
  ticketMedioMedio @Measures.ISOCurrency: moeda;
}
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
    Visualizations: ['@UI.LineItem#Benchmark']
  },

  UI.LineItem #Benchmark: [
    { Value: periodoLabel,     Label: '{i18n>KPI_Unidade_periodo}'                  },
    { Value: faturamentoMedio, Label: '{i18n>Benchmark_Cluster_faturamentoMedio}'   },
    { Value: ticketMedioMedio, Label: '{i18n>Benchmark_Cluster_ticketMedioMedio}'   },
    { Value: npsMedio,         Label: '{i18n>Benchmark_Cluster_npsMedio}'           }
  ]
);
