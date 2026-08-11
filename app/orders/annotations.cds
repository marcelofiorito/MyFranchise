using FranqueadoraService as service from '../../srv/service';

// ── Orders List Report ────────────────────────────────────────
annotate service.Orders with @(
  UI.LineItem: [
    { Value: ORDER_ID,         Label: 'Nº Pedido'       },
    { Value: STORE_NAME,       Label: 'Loja'            },
    { Value: ORDER_DATE,       Label: 'Data'            },
    {
      Value: STATUS,
      Label: 'Status',
      Criticality: STATUS_CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    { Value: TOTAL_AMOUNT,     Label: 'Valor Total'     },
    { Value: CURRENCY,         Label: 'Moeda'           },
    { Value: EXPECTED_DELIVERY, Label: 'Entrega Prev.'  }
  ],

  UI.SelectionFields: [STATUS, STORE_NAME, ORDER_DATE, REGION],

  UI.HeaderInfo: {
    TypeName:       'Pedido de Reposição',
    TypeNamePlural: 'Pedidos de Reposição',
    Title:          { Value: ORDER_ID },
    Description:    { Value: STORE_NAME }
  },

  UI.HeaderFacets: [
    {
      $Type:  'UI.ReferenceFacet',
      Target: '@UI.DataPoint#OrderStatus'
    },
    {
      $Type:  'UI.ReferenceFacet',
      Target: '@UI.DataPoint#TotalAmount'
    }
  ],

  UI.DataPoint #OrderStatus: {
    Value:       STATUS,
    Title:       'Status',
    Criticality: STATUS_CRITICALITY
  },
  UI.DataPoint #TotalAmount: {
    Value: TOTAL_AMOUNT,
    Title: 'Valor Total'
  },

  UI.Facets: [
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Detalhes do Pedido',
      Target: '@UI.FieldGroup#OrderDetails'
    },
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Itens do Pedido',
      Target: 'OrderItems/@UI.LineItem'
    }
  ],

  UI.FieldGroup #OrderDetails: {
    Data: [
      { Value: ORDER_ID,          Label: 'Nº Pedido'     },
      { Value: STORE_ID,          Label: 'Cód. Loja'     },
      { Value: STORE_NAME,        Label: 'Loja'          },
      { Value: ORDER_DATE,        Label: 'Data'          },
      { Value: EXPECTED_DELIVERY, Label: 'Entrega Prev.' },
      { Value: NOTES,             Label: 'Observações'   }
    ]
  }
);

// ── Order Items sub-table ─────────────────────────────────────
annotate service.OrderItems with @(
  UI.LineItem: [
    { Value: ITEM_NUM,      Label: 'Item'           },
    { Value: ARTICLE_NAME,  Label: 'Artigo'         },
    { Value: COLOR,         Label: 'Cor'            },
    { Value: SIZE_VAL,      Label: 'Tamanho'        },
    { Value: QTY_ORDERED,   Label: 'Qtde Pedida'    },
    { Value: QTY_DELIVERED, Label: 'Qtde Entregue'  },
    { Value: UNIT_PRICE,    Label: 'Preço Unit.'    },
    { Value: LINE_TOTAL,    Label: 'Total Linha'    }
  ]
);
