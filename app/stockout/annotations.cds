using FranqueadoraService as service from '../../srv/service';

// ── List Report: columns ──────────────────────────────────────
annotate service.StockoutAlerts with @(
  UI.LineItem: [
    { Value: STORE_NAME,       Label: 'Loja'               },
    { Value: CITY,             Label: 'Cidade'             },
    { Value: REGION,           Label: 'Região'             },
    { Value: ARTICLE_NAME,     Label: 'Artigo'             },
    { Value: COLOR,            Label: 'Cor'                },
    { Value: SIZE_VAL,         Label: 'Tamanho'            },
    { Value: QTY_ON_HAND,      Label: 'Estoque'            },
    {
      Value: DAYS_TO_STOCKOUT,
      Label: 'Dias p/ Ruptura',
      Criticality: CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    {
      Value: REVENUE_AT_RISK,
      Label: 'Receita em Risco',
      Criticality: CRITICALITY
    },
    {
      Value: STOCK_STATUS,
      Label: 'Status',
      Criticality: CRITICALITY,
      CriticalityRepresentation: #WithIcon
    }
  ],

  // ── Filter bar ───────────────────────────────────────────────
  UI.SelectionFields: [STOCK_STATUS, REGION, STORE_NAME, MATNR],

  // ── Object Page header ───────────────────────────────────────
  UI.HeaderInfo: {
    TypeName:       'Alerta de Ruptura',
    TypeNamePlural: 'Alertas de Ruptura',
    Title:          { Value: ARTICLE_NAME },
    Description:    { Value: STORE_NAME }
  },

  UI.HeaderFacets: [
    {
      $Type:  'UI.ReferenceFacet',
      Target: '@UI.DataPoint#StockStatus'
    },
    {
      $Type:  'UI.ReferenceFacet',
      Target: '@UI.DataPoint#RevenueAtRisk'
    },
    {
      $Type:  'UI.ReferenceFacet',
      Target: '@UI.DataPoint#DaysToStockout'
    }
  ],

  UI.DataPoint #StockStatus: {
    Value:       STOCK_STATUS,
    Title:       'Status',
    Criticality: CRITICALITY
  },
  UI.DataPoint #RevenueAtRisk: {
    Value: REVENUE_AT_RISK,
    Title: 'Receita em Risco'
  },
  UI.DataPoint #DaysToStockout: {
    Value:       DAYS_TO_STOCKOUT,
    Title:       'Dias até Ruptura',
    Criticality: CRITICALITY
  },

  // ── Object Page facets ───────────────────────────────────────
  UI.Facets: [
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Detalhes do SKU',
      Target: '@UI.FieldGroup#Details'
    },
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Impacto de Demanda',
      Target: '@UI.FieldGroup#Forecast'
    }
  ],

  UI.FieldGroup #Details: {
    Data: [
      { Value: MATNR,          Label: 'Material'           },
      { Value: COLOR,          Label: 'Cor'                },
      { Value: SIZE_VAL,       Label: 'Tamanho'            },
      { Value: QTY_ON_HAND,    Label: 'Qtde em Estoque'    },
      { Value: QTY_IN_TRANSIT, Label: 'Em Trânsito'        },
      { Value: SNAPSHOT_DATE,  Label: 'Atualizado em'      }
    ]
  },

  UI.FieldGroup #Forecast: {
    Data: [
      { Value: QTY_FORECAST,          Label: 'Previsão de Demanda' },
      { Value: DAYS_TO_STOCKOUT,      Label: 'Dias até Ruptura'    },
      { Value: WEATHER_IMPACT_PCT,    Label: '% Impacto Clima'     },
      { Value: CAMPAIGN_IMPACT_PCT,   Label: '% Impacto Campanha'  },
      { Value: RETAIL_PRICE,          Label: 'Preço de Venda'      },
      { Value: REVENUE_AT_RISK,       Label: 'Receita em Risco'    }
    ]
  }
);

// ── Field-level labels & value helps ─────────────────────────
annotate service.StockoutAlerts with {
  STOCK_STATUS @(
    Common.ValueList: {
      CollectionPath: 'StockoutAlerts',
      Parameters: [{ $Type: 'Common.ValueListParameterOut', LocalDataProperty: STOCK_STATUS, ValueListProperty: 'STOCK_STATUS' }]
    },
    Common.ValueListWithFixedValues: true
  );
  STORE_NAME   @Common.Label: 'Loja';
  REGION       @Common.Label: 'Região';
};
