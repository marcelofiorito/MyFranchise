using FranqueadoService as service from '../../srv/service';

annotate service.MyStore with @(

  UI.LineItem: [
    { Value: STORE_ID,   Label: 'Code'    },
    { Value: STORE_NAME, Label: 'Store'   },
    { Value: CITY,       Label: 'City'    },
    { Value: REGION,     Label: 'Region'  },
    { Value: STATUS,     Label: 'Status'  }
  ],

  UI.SelectionFields: [CITY, REGION, STATUS],

  UI.HeaderInfo: {
    TypeName:       'Store',
    TypeNamePlural: 'Stores',
    Title:          { Value: STORE_NAME },
    Description:    { Value: CITY },
    ImageUrl:       IMAGE_URL
  },

  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Status'   },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Region'   },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#OpenDate' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#AvgNps'   }
  ],

  UI.DataPoint #Status: {
    Value: STATUS,
    Title: 'Status'
  },

  UI.DataPoint #Region: {
    Value: REGION,
    Title: 'Region'
  },

  UI.DataPoint #OpenDate: {
    Value: OPEN_DATE,
    Title: 'Opening Date'
  },

  UI.DataPoint #AvgNps: {
    Value: AVG_NPS,
    Title: 'NPS Score',
    CriticalityCalculation: {
      ImprovementDirection:  #Maximize,
      ToleranceRangeLowValue: 30,
      DeviationRangeLowValue:  0
    }
  },

  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'At-Risk SKUs',
      Target: 'stockAlerts/@UI.LineItem'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Replenishment Orders',
      Target: 'orders/@UI.LineItem#MyOrders'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Customer NPS',
      Target: 'npsResponses/@UI.LineItem'
    }
  ]
);

annotate service.MyStore with {
  IMAGE_URL  @(Core.IsURL: true, UI.IsImageURL: true);
  AVG_NPS    @Common.Label: 'NPS Score';
  STORE_ID   @Common.Label: 'Store Code';
  STORE_NAME @Common.Label: 'Store Name';
  CITY       @Common.Label: 'City';
  REGION     @Common.Label: 'Region';
  STATUS     @Common.Label: 'Status';
  OPEN_DATE  @Common.Label: 'Opening Date';
};

// ── At-Risk SKUs (MyStockAlerts) ─────────────────────────────
annotate service.MyStockAlerts with @(

  UI.Chart #CriticalBySize: {
    Title:               'At-Risk SKUs',
    ChartType:           #Bar,
    Dimensions:          [SIZE_VAL],
    DimensionAttributes: [{ Dimension: SIZE_VAL, Role: #Category }],
    Measures:            [REVENUE_AT_RISK],
    MeasureAttributes:   [{ Measure: REVENUE_AT_RISK, Role: #Axis1 }]
  },

  UI.PresentationVariant #CriticalBySize: {
    SortOrder:      [{ Property: REVENUE_AT_RISK, Descending: true }],
    Visualizations: ['@UI.Chart#CriticalBySize']
  },

  UI.LineItem: [
    {
      $Type: 'UI.DataField',
      Value: IMAGE_URL,
      Label: 'Image'
    },
    { Value: ARTICLE_NAME,     Label: 'Article'             },
    { Value: COLOR,            Label: 'Color'               },
    { Value: SIZE_VAL,         Label: 'Size'                },
    {
      Value: STOCK_STATUS,
      Label: 'Status',
      Criticality: CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    { Value: QTY_ON_HAND,      Label: 'On Hand'             },
    { Value: QTY_IN_TRANSIT,   Label: 'In Transit'          },
    { Value: QTY_FORECAST,     Label: 'Forecast Demand'     },
    {
      Value: DAYS_TO_STOCKOUT,
      Label: 'Days to Stockout',
      Criticality: CRITICALITY
    },
    { Value: RETAIL_PRICE,     Label: 'Unit Price'          },
    {
      Value: REVENUE_AT_RISK,
      Label: 'Revenue at Risk',
      Criticality: CRITICALITY
    }
  ],

  UI.HeaderInfo: {
    TypeName:       'At-Risk SKU',
    TypeNamePlural: 'At-Risk SKUs',
    Title:          { Value: ARTICLE_NAME },
    Description:    { Value: STORE_NAME },
    ImageUrl:       IMAGE_URL
  }
);

annotate service.MyStockAlerts with {
  IMAGE_URL        @(Core.IsURL: true, UI.IsImageURL: true);
  ARTICLE_NAME     @Common.Label: 'Article';
  COLOR            @Common.Label: 'Color';
  SIZE_VAL         @Common.Label: 'Size';
  QTY_ON_HAND      @Common.Label: 'On Hand';
  QTY_IN_TRANSIT   @Common.Label: 'In Transit';
  QTY_FORECAST     @Common.Label: 'Forecast Demand';
  DAYS_TO_STOCKOUT @Common.Label: 'Days to Stockout';
  RETAIL_PRICE     @Common.Label: 'Unit Price';
  REVENUE_AT_RISK  @Common.Label: 'Revenue at Risk';
  STOCK_STATUS     @Common.Label: 'Status';
  CRITICALITY      @UI.Hidden;
};

// ── Replenishment Orders (MyOrders) ──────────────────────────
annotate service.MyOrders with @(

  UI.LineItem #MyOrders: [
    { Value: ORDER_ID,          Label: 'Order'             },
    { Value: ORDER_DATE,        Label: 'Date'              },
    {
      Value: STATUS,
      Label: 'Status',
      Criticality: STATUS_CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    { Value: TOTAL_AMOUNT,      Label: 'Total Amount'      },
    { Value: CURRENCY,          Label: 'Currency'          },
    { Value: EXPECTED_DELIVERY, Label: 'Expected Delivery' },
    { Value: NOTES,             Label: 'Notes'             }
  ],

  UI.HeaderInfo: {
    TypeName:       'Replenishment Order',
    TypeNamePlural: 'Replenishment Orders',
    Title:          { Value: ORDER_ID },
    Description:    { Value: STATUS }
  },

  UI.DataPoint #OrderStatus: {
    Value:       STATUS,
    Title:       'Status',
    Criticality: STATUS_CRITICALITY
  }
);

annotate service.MyOrders with {
  ORDER_ID           @Common.Label: 'Order #';
  ORDER_DATE         @Common.Label: 'Date';
  STATUS             @Common.Label: 'Status';
  TOTAL_AMOUNT       @Common.Label: 'Total Amount';
  CURRENCY           @Common.Label: 'Currency';
  EXPECTED_DELIVERY  @Common.Label: 'Expected Delivery';
  NOTES              @Common.Label: 'Notes';
  STATUS_CRITICALITY @UI.Hidden;
};

// ── Customer NPS (MyNps) ─────────────────────────────────────
annotate service.MyNps with @(

  UI.Chart #NpsByCategory: {
    Title:               'Customer NPS',
    ChartType:           #Donut,
    Dimensions:          [NPS_CATEGORY],
    DimensionAttributes: [{ Dimension: NPS_CATEGORY, Role: #Category }],
    Measures:            [SCORE],
    MeasureAttributes:   [{ Measure: SCORE, Role: #Axis1 }]
  },

  UI.PresentationVariant #NpsByCategory: {
    SortOrder:      [{ Property: SCORE, Descending: true }],
    Visualizations: ['@UI.Chart#NpsByCategory']
  },

  UI.LineItem: [
    {
      Value: SCORE,
      Label: 'Score',
      Criticality: CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    {
      Value: NPS_CATEGORY,
      Label: 'Category',
      Criticality: CRITICALITY
    },
    { Value: SURVEY_DATE, Label: 'Survey Date'      },
    { Value: CATEGORY,    Label: 'Raw Category'     },
    { Value: VERBATIM,    Label: 'Customer Comment' }
  ],

  UI.HeaderInfo: {
    TypeName:       'NPS Response',
    TypeNamePlural: 'NPS Responses',
    Title:          { Value: STORE_NAME },
    Description:    { Value: SURVEY_DATE }
  }
);

annotate service.MyNps with {
  SCORE        @Common.Label: 'NPS Score';
  NPS_CATEGORY @Common.Label: 'Category';
  CATEGORY     @Common.Label: 'Raw Category';
  SURVEY_DATE  @Common.Label: 'Survey Date';
  VERBATIM     @Common.Label: 'Comment';
  CRITICALITY  @UI.Hidden;
};
