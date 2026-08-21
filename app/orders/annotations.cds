using FranqueadoraService as service from '../../srv/service';

// ── Orders List Report ────────────────────────────────────────
annotate service.Orders with @(
  UI.LineItem: [
    { Value: ORDER_ID,          Label: 'Order #'         },
    { Value: STORE_NAME,        Label: 'Store'           },
    { Value: ORDER_DATE,        Label: 'Date'            },
    {
      Value: STATUS,
      Label: 'Status',
      Criticality: STATUS_CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    { Value: TOTAL_AMOUNT,      Label: 'Total Amount'    },
    { Value: CURRENCY,          Label: 'Currency'        },
    { Value: EXPECTED_DELIVERY, Label: 'Expected Delivery' }
  ],

  UI.SelectionFields: [STATUS, STORE_NAME, ORDER_DATE, REGION],

  UI.HeaderInfo: {
    TypeName:       'Replenishment Order',
    TypeNamePlural: 'Replenishment Orders',
    Title:          { Value: ORDER_ID },
    Description:    { Value: STORE_NAME }
  },

  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#OrderStatus' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#TotalAmount' }
  ],

  UI.DataPoint #OrderStatus: {
    Value:       STATUS,
    Title:       'Status',
    Criticality: STATUS_CRITICALITY
  },
  UI.DataPoint #TotalAmount: {
    Value: TOTAL_AMOUNT,
    Title: 'Total Amount'
  },

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Order Details', Target: '@UI.FieldGroup#OrderDetails' },
    { $Type: 'UI.ReferenceFacet', Label: 'Order Items',   Target: 'OrderItems/@UI.LineItem'     }
  ],

  UI.FieldGroup #OrderDetails: {
    Data: [
      { Value: ORDER_ID,          Label: 'Order #'           },
      { Value: STORE_ID,          Label: 'Store Code'        },
      { Value: STORE_NAME,        Label: 'Store'             },
      { Value: ORDER_DATE,        Label: 'Date'              },
      { Value: EXPECTED_DELIVERY, Label: 'Expected Delivery' },
      { Value: NOTES,             Label: 'Notes'             }
    ]
  }
);

// ── Order Items sub-table ─────────────────────────────────────
annotate service.OrderItems with @(
  UI.LineItem: [
    { Value: ITEM_NUM,      Label: 'Item'          },
    { Value: ARTICLE_NAME,  Label: 'Article'       },
    { Value: COLOR,         Label: 'Color'         },
    { Value: SIZE_VAL,      Label: 'Size'          },
    { Value: QTY_ORDERED,   Label: 'Qty Ordered'   },
    { Value: QTY_DELIVERED, Label: 'Qty Delivered' },
    { Value: UNIT_PRICE,    Label: 'Unit Price'    },
    { Value: LINE_TOTAL,    Label: 'Line Total'    }
  ]
);

// ── Field labels & value helps ────────────────────────────────
annotate service.Orders with {
  STATUS @(
    Common.Label: 'Order Status',
    Common.ValueList: {
      CollectionPath: 'Orders',
      Parameters: [{
        $Type: 'Common.ValueListParameterOut',
        LocalDataProperty: STATUS,
        ValueListProperty: 'STATUS'
      }]
    },
    Common.ValueListWithFixedValues: true
  );
  STORE_NAME @(
    Common.Label: 'Store',
    Common.ValueList: {
      CollectionPath: 'Orders',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',     LocalDataProperty: STORE_NAME, ValueListProperty: 'STORE_NAME' },
        { $Type: 'Common.ValueListParameterDisplay', ValueListProperty: 'STORE_ID'  }
      ]
    }
  );
  REGION @(
    Common.Label: 'Region',
    Common.ValueList: {
      CollectionPath: 'Orders',
      Parameters: [{
        $Type: 'Common.ValueListParameterOut',
        LocalDataProperty: REGION,
        ValueListProperty: 'REGION'
      }]
    },
    Common.ValueListWithFixedValues: false
  );
  ORDER_DATE        @Common.Label: 'Order Date';
  EXPECTED_DELIVERY @Common.Label: 'Expected Delivery';
  TOTAL_AMOUNT      @Common.Label: 'Total Amount';
  CURRENCY          @Common.Label: 'Currency';
  STATUS_CRITICALITY @UI.Hidden;
};
