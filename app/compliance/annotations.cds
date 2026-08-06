using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// GOVERNANCE & COMPLIANCE — List Report / Object Page
// EntitySet: Desvios (price deviations from authorized catalog)
// ─────────────────────────────────────────────────────────────

// ── Value Helps ──────────────────────────────────────────────
annotate service.Desvios with {
  tipo @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'TipoDesvio',
      Parameters    : [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: tipo_code, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
  severidade @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'Severidade',
      Parameters    : [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: severidade_code, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
  status @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'StatusDesvio',
      Parameters    : [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: status_code, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
}

annotate service.Desvios with @(

  UI.HeaderInfo: {
    TypeName      : 'Deviation',
    TypeNamePlural: 'Compliance Deviations',
    Title         : { Value: nomeProduto },
    Description   : { Value: unidadeNome }
  },

  UI.DataPoint #Severidade: {
    Value      : severidade_code,
    Title      : 'Severity',
    Criticality: severidadeCriticality
  },

  UI.DataPoint #Desvio: {
    Value      : percentualDesvio,
    Title      : 'Deviation %',
    Criticality: severidadeCriticality
  },

  // ── List columns ─────────────────────────────────────────
  UI.LineItem: [
    { Value: unidadeNome,     Label: 'Store',           ![@UI.Importance]: #High },
    { Value: unidadeCidade,   Label: 'City'                                      },
    { Value: tipo_code,       Label: 'Type'                                      },
    { Value: nomeProduto,     Label: 'Product',         ![@UI.Importance]: #High },
    { Value: precoAutorizado, Label: 'Auth. Price',     Criticality: severidadeCriticality, ![@UI.Importance]: #High },
    { Value: precoPraticado,  Label: 'Charged Price',   Criticality: severidadeCriticality, ![@UI.Importance]: #High },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Desvio',
      Label : 'Deviation %',
      ![@UI.Importance]: #High
    },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Severidade',
      Label : 'Severity',
      ![@UI.Importance]: #High
    },
    { Value: status_code,   Label: 'Status',   Criticality: severidadeCriticality, ![@UI.Importance]: #High },
    { Value: dataDeteccao,  Label: 'Detected'                                      }
  ],

  // ── Filters ──────────────────────────────────────────────
  UI.SelectionFields: [
    tipo_code,
    severidade_code,
    status_code,
    unidadeNome
  ],

  UI.PresentationVariant: {
    SortOrder     : [{ Property: severidadeCriticality, Descending: false }, { Property: percentualDesvio, Descending: true }],
    Visualizations: ['@UI.LineItem']
  },

  // ── Selection Variants ────────────────────────────────────
  UI.SelectionVariant #AltaSeveridade: {
    Text         : 'High severity',
    SelectOptions: [{ PropertyName: severidade_code, Ranges: [{ Sign: #I, Option: #EQ, Low: 'ALTA' }] }]
  },

  UI.SelectionVariant #Abertos: {
    Text         : 'Open',
    SelectOptions: [{ PropertyName: status_code, Ranges: [{ Sign: #I, Option: #EQ, Low: 'ABERTO' }] }]
  },

  // ── Object Page ───────────────────────────────────────────
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Comparativo',
      Label : 'Price Comparison'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Unidade',
      Label : 'Store Details'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: 'notificacoes/@UI.LineItem',
      Label : 'Notifications'
    }
  ],

  UI.FieldGroup #Comparativo: {
    Data: [
      { Value: tipo_code,        Label: 'Deviation Type'   },
      { Value: sku,              Label: 'SKU'               },
      { Value: nomeProduto,      Label: 'Product'           },
      { Value: precoAutorizado,  Label: 'Authorized Price'  },
      { Value: precoPraticado,   Label: 'Charged Price'     },
      { Value: percentualDesvio, Label: 'Deviation %',       Criticality: severidadeCriticality },
      { Value: severidade_code,  Label: 'Severity',          Criticality: severidadeCriticality },
      { Value: status_code,      Label: 'Status'             },
      { Value: dataDeteccao,     Label: 'Detected On'        },
      { Value: dataResolucao,    Label: 'Resolved On'        }
    ]
  },

  UI.FieldGroup #Unidade: {
    Data: [
      { Value: unidadeNome,          Label: 'Store Name'  },
      { Value: unidadeCidade,        Label: 'City'        },
      { Value: unidade.estado,       Label: 'State'       },
      { Value: unidade.cluster_code, Label: 'Cluster'     },
      { Value: unidade.regiao_code,  Label: 'Region'      }
    ]
  }
);

// ── Notifications sub-table ───────────────────────────────────
annotate service.NotificacoesCompliance with @(
  UI.LineItem: [
    { Value: dataEnvio,          Label: 'Sent On'          },
    { Value: prazoCorrecao,      Label: 'Correction Due'   },
    { Value: status_code,        Label: 'Status'           },
    { Value: comentarioResposta, Label: 'Store Response'   }
  ]
);
