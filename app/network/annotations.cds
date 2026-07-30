using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// PAINEL DA REDE — Analytical List Page
// EntitySet: Saude_Unidade
// ─────────────────────────────────────────────────────────────

annotate service.Saude_Unidade with @(

  UI.HeaderInfo: {
    TypeName       : 'Unidade',
    TypeNamePlural : 'Unidades da Rede',
    Title          : { Value: unidade.nome },
    Description    : { Value: unidade.cidade }
  },

  // ── Colunas da tabela ─────────────────────────────────────
  UI.LineItem: [
    { Value: unidade_ID,          Label: 'ID'          },
    { Value: unidade.codigo,      Label: 'Loja'        },
    { Value: unidade.nome,        Label: 'Unidade'     },
    { Value: unidade.cidade,      Label: 'Cidade'      },
    { Value: unidade.cluster_code,Label: 'Cluster'     },
    { Value: unidade.regiao_code, Label: 'Região'      },
    {
      Value      : scoreSaude,
      Label      : 'Score de Saúde',
      Criticality: scoreCriticality
    },
    { Value: compliancePct,   Label: 'Compliance %'   },
    { Value: performancePct,  Label: 'Performance %'  },
    { Value: qtdAlertasAlta,  Label: 'Alertas Alta'   },
    { Value: qtdAlertasMedia, Label: 'Alertas Média'  }
  ],

  // ── Filtros ───────────────────────────────────────────────
  UI.SelectionFields: [
    unidade.cluster_code,
    unidade.regiao_code,
    unidade.status_code
  ],

  // ── Selection Variants ────────────────────────────────────
  UI.SelectionVariant #Criticas: {
    Text          : 'Críticas',
    SelectOptions : [{
      PropertyName: scoreSaude,
      Ranges      : [{ Sign: #I, Option: #LE, Low: 44 }]
    }]
  },

  UI.SelectionVariant #Destaques: {
    Text          : 'Destaques',
    SelectOptions : [{
      PropertyName: scoreSaude,
      Ranges      : [{ Sign: #I, Option: #GE, Low: 80 }]
    }]
  },

  UI.SelectionVariant #Atencao: {
    Text          : 'Atenção',
    SelectOptions : [{
      PropertyName: scoreSaude,
      Ranges      : [
        { Sign: #I, Option: #GE, Low: 45 },
        { Sign: #I, Option: #LT, Low: 70 }
      ]
    }]
  },

  // ── Gráfico ───────────────────────────────────────────────
  UI.Chart #ScoreDistribuicao: {
    Title         : 'Score de Saúde da Rede',
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

  // ── Presentation Variant (tabela + chart lado a lado) ─────
  UI.PresentationVariant #default: {
    Text           : 'Painel da Rede',
    SortOrder      : [{ Property: scoreSaude, Descending: false }],
    Visualizations : ['@UI.LineItem', '@UI.Chart#ScoreDistribuicao']
  },

  // ── Selection+Presentation Variant padrão (referenciado no manifest) ──
  UI.SelectionPresentationVariant #default: {
    Text                : 'Padrão',
    SelectionVariant    : ![@UI.SelectionVariant#Criticas],
    PresentationVariant : ![@UI.PresentationVariant#default]
  },

  // ── DataPoint para o Score (usado no chart e header) ──────
  UI.DataPoint #ScoreSaude: {
    Value                    : scoreSaude,
    Title                    : 'Score de Saúde',
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
    TypeName       : 'Unidade',
    TypeNamePlural : 'Unidades',
    Title          : { Value: nome },
    Description    : { Value: cidade }
  },

  UI.HeaderFacets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Resumo',
      Label : 'Resumo'
    }
  ],

  UI.FieldGroup #Resumo: {
    Data: [
      { Value: codigo,        Label: 'Código'     },
      { Value: cluster_code,  Label: 'Cluster'    },
      { Value: regiao_code,   Label: 'Região'     },
      { Value: estado,        Label: 'Estado'     },
      { Value: dataAbertura,  Label: 'Abertura'   },
      { Value: status_code,   Label: 'Status'     }
    ]
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#DadosGerais',
      Label : 'Dados Gerais'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Endereco',
      Label : 'Endereço'
    }
  ],

  UI.FieldGroup #DadosGerais: {
    Data: [
      { Value: codigo,           Label: 'Código'          },
      { Value: nome,             Label: 'Nome'            },
      { Value: franqueado_ID,    Label: 'Franqueado ID'   },
      { Value: cluster_code,     Label: 'Cluster'         },
      { Value: regiao_code,      Label: 'Região'          },
      { Value: dataAbertura,     Label: 'Data de Abertura'},
      { Value: status_code,      Label: 'Status'          }
    ]
  },

  UI.FieldGroup #Endereco: {
    Data: [
      { Value: endereco, Label: 'Endereço' },
      { Value: cidade,   Label: 'Cidade'   },
      { Value: estado,   Label: 'Estado'   }
    ]
  }
);
