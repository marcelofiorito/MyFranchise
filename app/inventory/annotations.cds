using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// NETWORK STOCK MONITOR — List Report + Object Page
// Central to the stockout rupture flow (D1→D5):
//   • Grade Cor × Tamanho per SKU per store
//   • Demand forecast 14d, projected balance, stockout days
//   • Stockout financial impact
// ─────────────────────────────────────────────────────────────

annotate service.Estoque_Unidade with @(

  UI.SelectionFields: [ regiaoCode, clusterCode, status_code, categoria, cor, tipoLoja ],

  UI.PresentationVariant: {
    SortOrder     : [
      { Property: estoqueCriticality, Descending: false },
      { Property: rupturaEm,          Descending: false }
    ],
    Visualizations: [ '@UI.LineItem' ]
  }

) {
  regiaoCode @(
    title: 'Region',
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'Regiao',
      Parameters    : [
        { $Type : 'Common.ValueListParameterOut',
          LocalDataProperty: regiaoCode, ValueListProperty: 'code' },
        { $Type : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
  status @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'StatusEstoque',
      Parameters    : [
        { $Type : 'Common.ValueListParameterOut',
          LocalDataProperty: status_code, ValueListProperty: 'code' },
        { $Type : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
}

annotate service.Estoque_Unidade with @(

  UI.DataPoint #Cobertura: {
    Value       : coberturaDias,
    Title       : 'Coverage (days)',
    Criticality : estoqueCriticality
  },

  UI.DataPoint #Impacto: {
    Value : valorImpactoStockout,
    Title : 'Stockout Impact (R$)'
  },

  UI.DataPoint #RupturaEm: {
    Value       : rupturaEm,
    Title       : 'Stockout in (days)',
    Criticality : estoqueCriticality
  },

  // ── List: grade + stockout forecast ───────────────────────
  UI.LineItem: [
    { Value: unidadeNome,          Label: 'Store',              ![@UI.Importance]: #High },
    { Value: tipoLoja,             Label: 'Type'                                         },
    { Value: regiaoCode,           Label: 'Region',             ![@UI.Importance]: #High },
    { Value: nomeProduto,          Label: 'Product',            ![@UI.Importance]: #High },
    { Value: cor,                  Label: 'Color',              ![@UI.Importance]: #High },
    { Value: tamanho,              Label: 'Size',               ![@UI.Importance]: #High },
    { Value: saldoAtual,           Label: 'On Hand',            ![@UI.Importance]: #High },
    { Value: previsaoDemanda14d,   Label: 'Forecast 14d'                                 },
    { Value: saldoProjetado14d,    Label: 'Proj. Balance 14d'                            },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#RupturaEm',
      Label : 'Stockout In (days)',
      ![@UI.Importance]: #High
    },
    {
      Value      : status_code,
      Label      : 'Status',
      Criticality: estoqueCriticality,
      ![@UI.Importance]: #High
    },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Impacto',
      Label : 'Revenue at Risk'
    }
  ],

  // ── Object Page ───────────────────────────────────────────
  UI.HeaderInfo: {
    TypeName       : 'Grade Item',
    TypeNamePlural : 'Grade Items',
    Title          : { Value: nomeProduto },
    Description    : { Value: unidadeNome }
  },

  UI.FieldGroup #Grade: {
    Label: 'Product Grade (Color × Size)',
    Data : [
      { Value: sku,                Label: 'SKU'                                        },
      { Value: nomeProduto,        Label: 'Product'                                    },
      { Value: cor,                Label: 'Color'                                      },
      { Value: tamanho,            Label: 'Size'                                       },
      { Value: skuGrade,           Label: 'Grade SKU'                                  },
      { Value: categoria,          Label: 'Category'                                   }
    ]
  },

  UI.FieldGroup #Ruptura: {
    Label: 'Stockout Risk',
    Data : [
      { $Type: 'UI.DataFieldForAnnotation', Target: '@UI.DataPoint#Cobertura', Label: 'Coverage (days)' },
      { $Type: 'UI.DataFieldForAnnotation', Target: '@UI.DataPoint#RupturaEm', Label: 'Stockout In (days)' },
      { Value: status_code,          Label: 'Status',              Criticality: estoqueCriticality },
      { Value: saldoAtual,           Label: 'On Hand'              },
      { Value: estoqueMinimo,        Label: 'Reorder Point'        },
      { Value: previsaoDemanda14d,   Label: 'Forecast 14d'         },
      { Value: saldoProjetado14d,    Label: 'Projected Balance 14d'},
      { Value: giroMedioDiario,      Label: 'Daily Sales Rate'     },
      { Value: leadTimeDias,         Label: 'Lead Time (days)'     },
      { $Type: 'UI.DataFieldForAnnotation', Target: '@UI.DataPoint#Impacto', Label: 'Revenue at Risk' }
    ]
  },

  UI.FieldGroup #Localizacao: {
    Label: 'Store Details',
    Data : [
      { Value: unidadeNome,       Label: 'Store'              },
      { Value: unidadeCidade,     Label: 'City'               },
      { Value: regiaoCode,        Label: 'Region'             },
      { Value: clusterCode,       Label: 'Cluster'            },
      { Value: tipoLoja,          Label: 'Store Type'         },
      { Value: centroDistribuicao,Label: 'Distribution Center'}
    ]
  },

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Grade',      Label: 'Product Grade' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Ruptura',    Label: 'Stockout Risk' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Localizacao',Label: 'Store Details' },
    { $Type: 'UI.ReferenceFacet', Target: 'pedidos/@UI.LineItem#Pedidos', Label: 'Replenishment Orders' }
  ]
);

// ── Substitutos — shown inline from Replenishment or queried by Joule ─────────
annotate service.Substitutos with @(

  UI.HeaderInfo: {
    TypeName      : 'Substitute',
    TypeNamePlural: 'Substitutes',
    Title         : { Value: nomeSubstituto },
    Description   : { Value: corSubstituto }
  },

  UI.LineItem: [
    { Value: nomeOrigem,       Label: 'Original Product',  ![@UI.Importance]: #High },
    { Value: corOrigem,        Label: 'Original Color'                               },
    { Value: tamanhoOrigem,    Label: 'Original Size'                                },
    { Value: nomeSubstituto,   Label: 'Substitute',        ![@UI.Importance]: #High },
    { Value: corSubstituto,    Label: 'Substitute Color',  ![@UI.Importance]: #High },
    { Value: tamanhoSubstituto,Label: 'Substitute Size',   ![@UI.Importance]: #High },
    { Value: similaridade,     Label: 'Similarity %',      ![@UI.Importance]: #High },
    { Value: tipoSimilaridade, Label: 'Match Type'                                   },
    { Value: estoqueDisponivel,Label: 'Available Stock'                              }
  ]
);

// ── Replenishment Orders inline ───────────────────────────────────────────────
annotate service.Pedidos_Reposicao with @(
  UI.LineItem #Pedidos: [
    { Value: nomeProduto,        Label: 'Product'            },
    { Value: qtdSugerida,        Label: 'Suggested Qty'      },
    { Value: qtdAprovada,        Label: 'Approved Qty'       },
    {
      Value      : status_code,
      Label      : 'Status',
      Criticality: urgenciaCriticality,
      ![@UI.Importance]: #High
    },
    { Value: fornecedorSugerido, Label: 'Suggested Supplier' },
    { Value: prazoDesejado,      Label: 'Desired Date'       },
    { Value: origemLabel,        Label: 'Origin'             },
    { Value: justificativa,      Label: 'AI Agent Rationale', ![@UI.MultiLineText]: true }
  ]
);
