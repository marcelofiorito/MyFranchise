using FranqueadoService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// PORTAL DO FRANQUEADO — Overview Page (OVP)
// 8 cards: KPIs, Health Score, Category Margins, Campaigns,
//          Pending Actions, AI Recommendations, Stock Alerts, Benchmark
// ─────────────────────────────────────────────────────────────

// ── Card 0: My Revenue ────────────────────────────────────────
annotate service.MeusKPIs with {
  faturamento @Measures.ISOCurrency: moeda;
  ticketMedio @Measures.ISOCurrency: moeda;
  royalties   @Measures.ISOCurrency: moeda;
}
annotate service.MeusKPIs with @(

  UI.HeaderInfo: {
    TypeName      : 'Period',
    TypeNamePlural: 'My Revenue',
    Title         : { Value: unidadeNome },
    Description   : { Value: unidadeCidade }
  },

  UI.PresentationVariant #ByPeriod: {
    SortOrder     : [{ Property: periodo, Descending: true }],
    Visualizations: ['@UI.LineItem#Trend']
  },

  UI.LineItem #Trend: [
    { Value: periodoLabel,   Label: 'Period'         },
    { Value: faturamento,    Label: 'Revenue'        },
    { Value: ticketMedio,    Label: 'Avg Ticket'     },
    { Value: margemBruta,    Label: 'Gross Margin %' },
    { Value: crescimentoMoM, Label: 'MoM Growth %'  },
    { Value: nps,            Label: 'NPS'            }
  ],

  UI.SelectionVariant #LastPeriod: {
    Text: 'Last period'
  }
);

// ── Card 1: Health Score ──────────────────────────────────────
annotate service.MinhaSaude with @(

  UI.HeaderInfo: {
    TypeName      : 'Health Score',
    TypeNamePlural: 'Health Score',
    Title         : { Value: unidadeNome },
    Description   : { Value: unidadeCidade }
  },

  UI.DataPoint #ScoreSaude: {
    Value        : scoreSaude,
    Title        : 'Health Score',
    Criticality  : scoreCriticality,
    MaximumValue : 100,
    MinimumValue : 0
  },

  UI.KPI #HealthKPI: {
    DataPoint : ![@UI.DataPoint#ScoreSaude],
    Detail    : { DefaultPresentationVariant: ![@UI.PresentationVariant] }
  },

  UI.LineItem #Saude: [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#ScoreSaude',
      Label : 'Health Score',
      ![@UI.Importance]: #High
    },
    { Value: compliancePct,  Label: 'Compliance %'  },
    { Value: performancePct, Label: 'Performance %' }
  ],

  UI.SelectionVariant #Current: {
    Text: 'Current'
  }
);

// ── Card 2: Category Margins ──────────────────────────────────
annotate service.MeusKPI_Categoria with @(

  UI.HeaderInfo: {
    TypeName      : 'Category',
    TypeNamePlural: 'Category Margins',
    Title         : { Value: categoria },
    Description   : { Value: periodoLabel }
  },

  UI.DataPoint #Margem: {
    Value      : margemBruta,
    Title      : 'Gross Margin %',
    Criticality: margemCriticality
  },

  UI.PresentationVariant #ByCategoria: {
    SortOrder     : [{ Property: margemBruta, Descending: true }],
    Visualizations: ['@UI.LineItem#Categoria']
  },

  UI.LineItem #Categoria: [
    { Value: categoria,    Label: 'Category',       ![@UI.Importance]: #High },
    { Value: periodoLabel, Label: 'Period'                                   },
    { Value: faturamento,  Label: 'Revenue'                                  },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Margem',
      Label : 'Gross Margin %',
      ![@UI.Importance]: #High
    },
    { Value: meta,         Label: 'Target %'                                 },
    { Value: participacao, Label: 'Revenue Share %'                          }
  ],

  UI.SelectionVariant #LastPeriod: {
    Text: 'Latest period'
  }
);

// ── Card 3: Campaigns ─────────────────────────────────────────
annotate service.MinhasAtivacoes with @(

  UI.HeaderInfo: {
    TypeName      : 'Campaign',
    TypeNamePlural: 'Campaigns',
    Title         : { Value: campanhaNome },
    Description   : { Value: unidadeNome }
  },

  UI.DataPoint #Ativacao: {
    Value      : taxaAtivacao,
    Title      : 'Activation Rate %',
    Criticality: ativacaoCriticality
  },

  UI.LineItem #Campanhas: [
    { Value: campanhaNome,   Label: 'Campaign',      ![@UI.Importance]: #High },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Ativacao',
      Label : 'Activation %',
      ![@UI.Importance]: #High
    },
    { Value: metaAtivacao,   Label: 'Target %'                                },
    { Value: campanhaInicio, Label: 'Start'                                   },
    { Value: campanhaFim,    Label: 'End'                                     }
  ],

  UI.SelectionVariant #Ativas: {
    Text: 'All campaigns'
  }
);

// ── Card 4: Pending Actions ───────────────────────────────────
annotate service.MeusDesvios with @(

  UI.DataPoint #Severidade: {
    Value      : severidade_code,
    Title      : 'Severity',
    Criticality: severidadeCrit
  },

  UI.LineItem #Pendentes: [
    { Value: nomeProduto,      Label: 'Product',      ![@UI.Importance]: #High },
    { Value: tipo_code,        Label: 'Type'                                   },
    { Value: percentualDesvio, Label: 'Deviation %',  ![@UI.Importance]: #High },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Severidade',
      Label : 'Severity',
      ![@UI.Importance]: #High
    }
  ],

  UI.SelectionVariant #Abertos: {
    Text         : 'Open deviations',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [
        { Sign: #I, Option: #EQ, Low: 'ABERTO'     },
        { Sign: #I, Option: #EQ, Low: 'NOTIFICADO' }
      ]
    }]
  }
);

// ── Card 5: AI Recommendations ────────────────────────────────
annotate service.MinhasRecomendacoes with @(

  UI.HeaderInfo: {
    TypeName      : 'Recommendation',
    TypeNamePlural: 'AI Recommendations',
    Title         : { Value: titulo },
    Description   : { Value: tipo_code }
  },

  UI.DataPoint #Prioridade: {
    Value      : prioridade_code,
    Title      : 'Priority',
    Criticality: prioridadeCrit
  },

  UI.LineItem #Recomendacoes: [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Prioridade',
      Label : 'Priority',
      ![@UI.Importance]: #High
    },
    { Value: titulo,    Label: 'Recommendation', ![@UI.Importance]: #High },
    { Value: tipo_code, Label: 'Type',            ![@UI.Importance]: #Medium }
  ],

  UI.LineItem: [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Prioridade',
      Label : 'Priority'
    },
    { Value: titulo,      Label: 'Recommendation', ![@UI.Importance]: #High },
    { Value: tipo_code,   Label: 'Type' },
    { Value: dataGeracao, Label: 'Generated On' }
  ],

  UI.FieldGroup #Detalhe: {
    Data: [
      { Value: descricao,       Label: 'Details'      },
      { Value: prioridade_code, Label: 'Priority'     },
      { Value: dataGeracao,     Label: 'Generated On' }
    ]
  },

  UI.Facets: [{
    $Type : 'UI.ReferenceFacet',
    Target: '@UI.FieldGroup#Detalhe',
    Label : 'Recommendation Details'
  }],

  UI.SelectionVariant #Novas: {
    Text         : 'New',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [{ Sign: #I, Option: #EQ, Low: 'NOVA' }]
    }]
  }
);

// ── Card 6: Stock Alerts ──────────────────────────────────────
annotate service.MeuEstoque with @(

  UI.HeaderInfo: {
    TypeName      : 'Product',
    TypeNamePlural: 'Stock Alerts',
    Title         : { Value: nomeProduto },
    Description   : { Value: unidadeNome }
  },

  UI.DataPoint #EstoqueStatus: {
    Value      : status_code,
    Title      : 'Stock Status',
    Criticality: estoqueCriticality
  },

  UI.LineItem #EstoqueAlertas: [
    { Value: nomeProduto,   Label: 'Product',       ![@UI.Importance]: #High },
    { Value: saldoAtual,    Label: 'On Hand',        ![@UI.Importance]: #High },
    { Value: estoqueMinimo, Label: 'Reorder Point'                           },
    { Value: coberturaDias, Label: 'Days Cover',     ![@UI.Importance]: #High },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#EstoqueStatus',
      Label : 'Status',
      ![@UI.Importance]: #High
    }
  ],

  UI.SelectionVariant #Criticos: {
    Text         : 'Critical stock',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [
        { Sign: #I, Option: #EQ, Low: 'RUPTURA' },
        { Sign: #I, Option: #EQ, Low: 'ATENCAO' }
      ]
    }]
  }
);

// ── Card 7: Network Position — Cluster Benchmark ──────────────
annotate service.BenchmarkMeuCluster with {
  faturamentoMedio @Measures.ISOCurrency: moeda;
  ticketMedioMedio @Measures.ISOCurrency: moeda;
}
annotate service.BenchmarkMeuCluster with @(

  UI.HeaderInfo: {
    TypeName      : 'Period',
    TypeNamePlural: 'Cluster Benchmark',
    Title         : { Value: periodoLabel },
    Description   : { Value: cluster_code }
  },

  UI.PresentationVariant #ByPeriod: {
    SortOrder     : [{ Property: periodo, Descending: false }],
    Visualizations: ['@UI.LineItem#Benchmark']
  },

  UI.LineItem #Benchmark: [
    { Value: periodoLabel,     Label: 'Period'      },
    { Value: faturamentoMedio, Label: 'Avg Revenue' },
    { Value: ticketMedioMedio, Label: 'Avg Ticket'  },
    { Value: npsMedio,         Label: 'Avg NPS'     }
  ]
);
