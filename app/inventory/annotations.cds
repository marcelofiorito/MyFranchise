using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// STOCK MANAGEMENT — List Report + Object Page
// Shows stockout risk by store/region with seasonality.
// Anchor scenario: Havaianas in July — NE in stockout vs. South OK.
// ─────────────────────────────────────────────────────────────

annotate service.Estoque_Unidade with @(

  // ── Filters: region, cluster, status, category ──
  UI.SelectionFields: [ regiaoCode, clusterCode, status_code, categoria ],

  // ── Presentation: sort by coverage ascending (shortest coverage first) ──
  UI.PresentationVariant: {
    SortOrder     : [
      { Property: coberturaDias, Descending: false }
    ],
    Visualizations: [ '@UI.LineItem' ]
  }

) {
  // ValueHelp for region: displays N / NE / CO / SE / S with full name
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
  // ValueHelp for status: OK / WARNING / STOCKOUT
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

  // ── DataPoint: coverage with criticality (red = stockout) ──
  UI.DataPoint #Cobertura: {
    Value       : coberturaDias,
    Title       : 'Coverage (days)',
    Criticality : estoqueCriticality
  },

  // ── Table ──────────────────────────────────────────────────
  UI.LineItem: [
    { Value: unidadeNome,   Label: 'Store',            ![@UI.Importance]: #High },
    { Value: unidadeCidade, Label: 'City',             ![@UI.Importance]: #Medium },
    { Value: regiaoCode,    Label: 'Region',           ![@UI.Importance]: #High },
    { Value: nomeProduto,   Label: 'Product',          ![@UI.Importance]: #High },
    { Value: categoria,     Label: 'Category' },
    { Value: saldoAtual,    Label: 'Current Stock' },
    { Value: estoqueMinimo, Label: 'Min. Stock' },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Cobertura',
      Label : 'Coverage (days)',
      ![@UI.Importance]: #High
    },
    {
      Value      : status_code,
      Label      : 'Status',
      Criticality: estoqueCriticality,
      ![@UI.Importance]: #High
    }
  ],

  // ── Object Page ───────────────────────────────────────────
  UI.HeaderInfo: {
    TypeName       : 'Inventory Item',
    TypeNamePlural : 'Inventory Items',
    Title          : { Value: nomeProduto },
    Description    : { Value: unidadeNome }
  },

  UI.FieldGroup #Situacao: {
    Label: 'Stock Situation',
    Data : [
      { $Type: 'UI.DataFieldForAnnotation', Target: '@UI.DataPoint#Cobertura', Label: 'Coverage (days)' },
      { Value: status_code,     Label: 'Status',              Criticality: estoqueCriticality },
      { Value: saldoAtual,      Label: 'Current Stock' },
      { Value: estoqueMinimo,   Label: 'Min. Stock' },
      { Value: giroMedioDiario, Label: 'Avg. Daily Turnover' },
      { Value: leadTimeDias,    Label: 'Lead Time (days)' }
    ]
  },

  UI.FieldGroup #Localizacao: {
    Label: 'Store and Product',
    Data : [
      { Value: unidadeNome,   Label: 'Store' },
      { Value: unidadeCidade, Label: 'City' },
      { Value: regiaoCode,    Label: 'Region' },
      { Value: clusterCode,   Label: 'Cluster' },
      { Value: sku,           Label: 'SKU' },
      { Value: categoria,     Label: 'Category' }
    ]
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Situacao',
      Label : 'Stock Situation'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Localizacao',
      Label : 'Store and Product'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: 'pedidos/@UI.LineItem#Pedidos',
      Label : 'Replenishment Orders'
    }
  ]
);

// ── Replenishment Orders — inline table in Stock Object Page ──────────────────
// Annotation on Pedidos_Reposicao with qualifier #Pedidos,
// referenced by the Facet above via 'pedidos/@UI.LineItem#Pedidos'.
annotate service.Pedidos_Reposicao with @(
  UI.LineItem #Pedidos: [
    { Value: nomeProduto,        Label: 'Product' },
    { Value: qtdSugerida,        Label: 'Suggested Qty' },
    { Value: qtdAprovada,        Label: 'Approved Qty' },
    {
      Value      : status_code,
      Label      : 'Status',
      Criticality: urgenciaCriticality,
      ![@UI.Importance]: #High
    },
    { Value: fornecedorSugerido, Label: 'Suggested Supplier' },
    { Value: prazoDesejado,      Label: 'Desired Date' },
    { Value: origem,             Label: 'Origin' },
    { Value: justificativa,      Label: 'AI Agent Rationale', ![@UI.MultiLineText]: true }
  ]
);
