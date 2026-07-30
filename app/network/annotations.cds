using FranqueadoraService as service from '../../srv/service';

// ═════════════════════════════════════════════════════════════
// PAINEL DA REDE — Analytical List Page (view Saude_Dashboard)
// View agregável (@Aggregation.ApplySupported) → suporta chart
// ═════════════════════════════════════════════════════════════

annotate service.Saude_Dashboard with @(

  UI.HeaderInfo: {
    TypeName       : '{i18n>Unidades}',
    TypeNamePlural : '{i18n>lbl_network_unidadesDaRede}',
    Title          : { Value: nome },
    Description    : { Value: cidade }
  },

  UI.SelectionFields: [ cluster_code, regiao_code, scoreCriticality ],

  UI.LineItem: [
    { Value: codigo,       Label: '{i18n>lbl_network_loja}'   },
    { Value: nome,         Label: '{i18n>Unidades_nome}'      },
    { Value: cidade,       Label: '{i18n>Unidades_cidade}'    },
    { Value: cluster_code, Label: '{i18n>Unidades_cluster}'   },
    { Value: regiao_code,  Label: '{i18n>Unidades_regiao}'    },
    {
      Value      : scoreSaude,
      Label      : '{i18n>Saude_Unidade_scoreSaude}',
      Criticality: scoreCriticality,
      CriticalityRepresentation: #WithIcon
    },
    { Value: compliancePct,   Label: '{i18n>Saude_Unidade_compliancePct}'   },
    { Value: performancePct,  Label: '{i18n>Saude_Unidade_performancePct}'  },
    { Value: qtdAlertasAlta,  Label: '{i18n>Saude_Unidade_qtdAlertasAlta}'  },
    { Value: qtdAlertasMedia, Label: '{i18n>Saude_Unidade_qtdAlertasMedia}' }
  ],

  // Medidas agregadas para o chart
  Analytics.AggregatedProperties: [
    {
      Name                : 'scoreMedio',
      AggregationMethod   : 'average',
      AggregatableProperty: scoreSaude,
      ![@Common.Label]    : '{i18n>Saude_Unidade_scoreSaude}'
    },
    {
      Name                : 'totalUnidades',
      AggregationMethod   : 'countdistinct',
      AggregatableProperty: ID,
      ![@Common.Label]    : '{i18n>lbl_network_unidadesDaRede}'
    }
  ],

  UI.PresentationVariant: {
    SortOrder     : [{ Property: scoreSaude, Descending: false }],
    Visualizations: ['@UI.Chart', '@UI.LineItem']
  },

  UI.Chart: {
    ChartType    : #Donut,
    Title        : '{i18n>lbl_network_chartTitle}',
    Measures     : [ totalUnidades ],
    MeasureAttributes: [{
      $Type  : 'UI.ChartMeasureAttributeType',
      Measure: totalUnidades,
      Role   : #Axis1
    }],
    Dimensions   : [ scoreCriticality ],
    DimensionAttributes: [{
      $Type    : 'UI.ChartDimensionAttributeType',
      Dimension: scoreCriticality,
      Role     : #Category
    }]
  }
);

// ─────────────────────────────────────────────────────────────
// (legado) Saude_Unidade — mantido para referência/navegação
// ─────────────────────────────────────────────────────────────

annotate service.Saude_Unidade with @(

  UI.HeaderInfo: {
    TypeName       : '{i18n>Unidades}',
    TypeNamePlural : '{i18n>lbl_network_unidadesDaRede}',
    Title          : { Value: unidade.nome },
    Description    : { Value: unidade.cidade }
  },

  // ── Colunas da tabela ─────────────────────────────────────
  UI.LineItem: [
    { Value: unidade_ID,          Label: '{i18n>lbl_network_id}'                  },
    { Value: unidade.codigo,      Label: '{i18n>lbl_network_loja}'                },
    { Value: unidade.nome,        Label: '{i18n>Unidades_nome}'                   },
    { Value: unidade.cidade,      Label: '{i18n>Unidades_cidade}'                 },
    { Value: unidade.cluster_code,Label: '{i18n>Unidades_cluster}'                },
    { Value: unidade.regiao_code, Label: '{i18n>Unidades_regiao}'                 },
    {
      Value      : scoreSaude,
      Label      : '{i18n>Saude_Unidade_scoreSaude}',
      Criticality: scoreCriticality
    },
    { Value: compliancePct,   Label: '{i18n>Saude_Unidade_compliancePct}'   },
    { Value: performancePct,  Label: '{i18n>Saude_Unidade_performancePct}'  },
    { Value: qtdAlertasAlta,  Label: '{i18n>Saude_Unidade_qtdAlertasAlta}'  },
    { Value: qtdAlertasMedia, Label: '{i18n>Saude_Unidade_qtdAlertasMedia}' }
  ],

  // ── Filtros ───────────────────────────────────────────────
  UI.SelectionFields: [
    unidade.cluster_code,
    unidade.regiao_code,
    unidade.status_code
  ],

  // ── Selection Variants ────────────────────────────────────
  UI.SelectionVariant #Criticas: {
    Text          : '{i18n>lbl_network_varCriticas}',
    SelectOptions : [{
      PropertyName: scoreSaude,
      Ranges      : [{ Sign: #I, Option: #LE, Low: 44 }]
    }]
  },

  UI.SelectionVariant #Destaques: {
    Text          : '{i18n>lbl_network_varDestaques}',
    SelectOptions : [{
      PropertyName: scoreSaude,
      Ranges      : [{ Sign: #I, Option: #GE, Low: 80 }]
    }]
  },

  UI.SelectionVariant #Atencao: {
    Text          : '{i18n>lbl_network_varAtencao}',
    SelectOptions : [{
      PropertyName: scoreSaude,
      Ranges      : [
        { Sign: #I, Option: #GE, Low: 45 },
        { Sign: #I, Option: #LT, Low: 70 }
      ]
    }]
  },

  // ── Gráfico (mantido para uso futuro; não referenciado no manifest LR) ──
  UI.Chart: {
    Title         : '{i18n>lbl_network_chartTitle}',
    ChartType     : #Donut,
    Dimensions    : [scoreCriticality],
    DimensionAttributes: [{
      Dimension: scoreCriticality,
      Role     : #Category
    }],
    Measures      : [scoreSaude],
    MeasureAttributes: [{
      Measure: scoreSaude,
      Role   : #Axis1
    }]
  },

  // ── DataPoint para o Score (usado no chart e header) ──────
  UI.DataPoint #ScoreSaude: {
    Value                    : scoreSaude,
    Title                    : '{i18n>Saude_Unidade_scoreSaude}',
    Criticality              : scoreCriticality,
    CriticalityCalculation   : {
      ImprovementDirection   : #Maximize,
      ToleranceRangeLowValue : 45,
      DeviationRangeLowValue : 0
    }
  }
);

// ─────────────────────────────────────────────────────────────
// OBJECT PAGE — Unidades
// Navegação: Saude_Unidade → Unidades
// ─────────────────────────────────────────────────────────────

annotate service.Unidades with @(

  UI.HeaderInfo: {
    TypeName       : '{i18n>Unidades}',
    TypeNamePlural : '{i18n>Unidades_plural}',
    Title          : { Value: nome },
    Description    : { Value: cidade }
  },

  UI.HeaderFacets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Resumo',
      Label : '{i18n>lbl_network_facetResumo}'
    }
  ],

  UI.FieldGroup #Resumo: {
    Data: [
      { Value: codigo,        Label: '{i18n>Unidades_codigo}'        },
      { Value: cluster_code,  Label: '{i18n>Unidades_cluster}'       },
      { Value: regiao_code,   Label: '{i18n>Unidades_regiao}'        },
      { Value: estado,        Label: '{i18n>Unidades_estado}'        },
      { Value: dataAbertura,  Label: '{i18n>lbl_network_abertura}'   },
      { Value: status_code,   Label: '{i18n>Unidades_status}'        }
    ]
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#DadosGerais',
      Label : '{i18n>lbl_network_facetDadosGerais}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Endereco',
      Label : '{i18n>lbl_network_facetEndereco}'
    }
  ],

  UI.FieldGroup #DadosGerais: {
    Data: [
      { Value: codigo,           Label: '{i18n>Unidades_codigo}'          },
      { Value: nome,             Label: '{i18n>lbl_network_nome}'         },
      { Value: franqueado_ID,    Label: '{i18n>lbl_network_franqueadoId}' },
      { Value: cluster_code,     Label: '{i18n>Unidades_cluster}'         },
      { Value: regiao_code,      Label: '{i18n>Unidades_regiao}'          },
      { Value: dataAbertura,     Label: '{i18n>Unidades_dataAbertura}'    },
      { Value: status_code,      Label: '{i18n>Unidades_status}'          }
    ]
  },

  UI.FieldGroup #Endereco: {
    Data: [
      { Value: endereco, Label: '{i18n>Unidades_endereco}' },
      { Value: cidade,   Label: '{i18n>Unidades_cidade}'   },
      { Value: estado,   Label: '{i18n>Unidades_estado}'   }
    ]
  }
);
