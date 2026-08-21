using FranqueadoraService as service from '../../srv/service';

// ── List Report: columns ──────────────────────────────────────
annotate service.StockoutAlerts with @(
  UI.LineItem: [
    { Value: STORE_NAME,       Label: 'Store'              },
    { Value: CITY,             Label: 'City'               },
    { Value: REGION,           Label: 'Region'             },
    { Value: ARTICLE_NAME,     Label: 'Article'            },
    { Value: COLOR,            Label: 'Color'              },
    { Value: SIZE_VAL,         Label: 'Size'               },
    { Value: QTY_ON_HAND,      Label: 'On Hand'            },
    {
      Value: DAYS_TO_STOCKOUT,
      Label: 'Days to Stockout',
      Criticality: CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    {
      Value: REVENUE_AT_RISK,
      Label: 'Revenue at Risk',
      Criticality: CRITICALITY
    },
    {
      Value: STOCK_STATUS,
      Label: 'Status',
      Criticality: CRITICALITY,
      CriticalityRepresentation: #WithIcon
    }
  ],

  UI.SelectionFields: [STOCK_STATUS, REGION, STORE_NAME, MATNR],

  UI.HeaderInfo: {
    TypeName:       'Stockout Alert',
    TypeNamePlural: 'Stockout Alerts',
    Title:          { Value: ARTICLE_NAME },
    Description:    { Value: STORE_NAME }
  },

  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#StockStatus'   },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#RevenueAtRisk' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#DaysToStockout'}
  ],

  UI.DataPoint #StockStatus: {
    Value:       STOCK_STATUS,
    Title:       'Status',
    Criticality: CRITICALITY
  },
  UI.DataPoint #RevenueAtRisk: {
    Value: REVENUE_AT_RISK,
    Title: 'Revenue at Risk'
  },
  UI.DataPoint #DaysToStockout: {
    Value:       DAYS_TO_STOCKOUT,
    Title:       'Days to Stockout',
    Criticality: CRITICALITY
  },

  // ── OVP Chart annotations ──────────────────────────────────
  UI.Chart #RevenueByStore: {
    Title:               'Revenue at Risk by Store',
    ChartType:           #Bar,
    Dimensions:          [STORE_NAME],
    DimensionAttributes: [{ Dimension: STORE_NAME, Role: #Category }],
    Measures:            [REVENUE_AT_RISK],
    MeasureAttributes:   [{ Measure: REVENUE_AT_RISK, Role: #Axis1 }]
  },

  UI.Chart #StockStatusDonut: {
    Title:               'Critical vs. Attention SKUs',
    ChartType:           #Donut,
    Dimensions:          [STOCK_STATUS],
    DimensionAttributes: [{ Dimension: STOCK_STATUS, Role: #Category }],
    Measures:            [REVENUE_AT_RISK],
    MeasureAttributes:   [{ Measure: REVENUE_AT_RISK, Role: #Axis1 }]
  },

  UI.PresentationVariant #RevenueByStore: {
    SortOrder:      [{ Property: REVENUE_AT_RISK, Descending: true }],
    Visualizations: ['@UI.Chart#RevenueByStore']
  },

  UI.SelectionVariant #Critical: {
    SelectOptions: [{
      PropertyName: STOCK_STATUS,
      Ranges: [{ Sign: #I, Option: #EQ, Low: 'R' }]
    }]
  },

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'SKU Details',     Target: '@UI.FieldGroup#Details'  },
    { $Type: 'UI.ReferenceFacet', Label: 'Demand Forecast', Target: '@UI.FieldGroup#Forecast' }
  ],

  UI.FieldGroup #Details: {
    Data: [
      { Value: MATNR,          Label: 'Material'         },
      { Value: COLOR,          Label: 'Color'            },
      { Value: SIZE_VAL,       Label: 'Size'             },
      { Value: QTY_ON_HAND,    Label: 'Qty on Hand'      },
      { Value: QTY_IN_TRANSIT, Label: 'In Transit'       },
      { Value: SNAPSHOT_DATE,  Label: 'Last Updated'     }
    ]
  },

  UI.FieldGroup #Forecast: {
    Data: [
      { Value: QTY_FORECAST,        Label: 'Demand Forecast'    },
      { Value: DAYS_TO_STOCKOUT,    Label: 'Days to Stockout'   },
      { Value: WEATHER_IMPACT_PCT,  Label: 'Weather Impact %'   },
      { Value: CAMPAIGN_IMPACT_PCT, Label: 'Campaign Impact %'  },
      { Value: RETAIL_PRICE,        Label: 'Retail Price'       },
      { Value: REVENUE_AT_RISK,     Label: 'Revenue at Risk'    }
    ]
  }
);

// ── Field labels & value helps ────────────────────────────────
annotate service.StockoutAlerts with {
  STOCK_STATUS @(
    Common.Label: 'Stock Status',
    Common.ValueList: {
      CollectionPath: 'StockoutAlerts',
      Parameters: [{
        $Type: 'Common.ValueListParameterOut',
        LocalDataProperty: STOCK_STATUS,
        ValueListProperty: 'STOCK_STATUS'
      }]
    },
    Common.ValueListWithFixedValues: true
  );
  REGION @(
    Common.Label: 'Region',
    Common.ValueList: {
      CollectionPath: 'StockoutAlerts',
      Parameters: [{
        $Type: 'Common.ValueListParameterOut',
        LocalDataProperty: REGION,
        ValueListProperty: 'REGION'
      }]
    },
    Common.ValueListWithFixedValues: false
  );
  STORE_NAME @(
    Common.Label: 'Store',
    Common.ValueList: {
      CollectionPath: 'StockoutAlerts',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',     LocalDataProperty: STORE_NAME, ValueListProperty: 'STORE_NAME' },
        { $Type: 'Common.ValueListParameterDisplay', ValueListProperty: 'CITY'      }
      ]
    }
  );
  MATNR @(
    Common.Label: 'Material',
    Common.ValueList: {
      CollectionPath: 'StockoutAlerts',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',     LocalDataProperty: MATNR,        ValueListProperty: 'MATNR'        },
        { $Type: 'Common.ValueListParameterDisplay', ValueListProperty: 'ARTICLE_NAME' }
      ]
    }
  );
  ARTICLE_NAME     @Common.Label: 'Article';
  CITY             @Common.Label: 'City';
  COLOR            @Common.Label: 'Color';
  SIZE_VAL         @Common.Label: 'Size';
  QTY_ON_HAND      @Common.Label: 'Qty on Hand';
  DAYS_TO_STOCKOUT @Common.Label: 'Days to Stockout';
  REVENUE_AT_RISK  @Common.Label: 'Revenue at Risk';
  RETAIL_PRICE     @Common.Label: 'Retail Price';
  CRITICALITY      @UI.Hidden;
};

