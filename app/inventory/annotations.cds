using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// ESTOQUE & REPOSIÇÃO — List Report + Object Page
// Mostra risco de ruptura por loja/região com sazonalidade.
// Cenário-âncora: Havaianas em julho — NE em ruptura x Sul OK.
// ─────────────────────────────────────────────────────────────

annotate service.Estoque_Unidade with @(

  // ── Filtros: região (Sul × Nordeste), status, categoria ──
  UI.SelectionFields: [ regiaoCode, status_code, categoria ],

) {
  // ValueHelp na região: apresenta lista N/NE/CO/SE/S com o nome completo
  regiaoCode @(
    title: 'Região',
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
  // ValueHelp no status: OK / ATENCAO / RUPTURA
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

  // ── DataPoint: cobertura com criticality (vermelho = ruptura) ──
  UI.DataPoint #Cobertura: {
    Value       : coberturaDias,
    Title       : '{i18n>Estoque_coberturaDias}',
    Criticality : estoqueCriticality
  },

  // ── Tabela ────────────────────────────────────────────────
  UI.LineItem: [
    { Value: unidadeCodigo, Label: '{i18n>lbl_network_loja}' },
    { Value: unidadeNome,   Label: '{i18n>Unidades_nome}', ![@UI.Importance]: #High },
    { Value: regiaoCode,    Label: '{i18n>Unidades_regiao}', ![@UI.Importance]: #High },
    { Value: nomeProduto,   Label: '{i18n>ItensCatalogo_nomeProduto}', ![@UI.Importance]: #High },
    { Value: categoria,     Label: '{i18n>ItensCatalogo_categoria}' },
    { Value: saldoAtual,    Label: '{i18n>Estoque_saldoAtual}' },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Cobertura',
      Label : '{i18n>Estoque_coberturaDias}',
      ![@UI.Importance]: #High
    },
    {
      Value      : status_code,
      Label      : '{i18n>Estoque_status}',
      Criticality: estoqueCriticality,
      ![@UI.Importance]: #High
    }
  ],

  // ── Object Page ───────────────────────────────────────────
  UI.HeaderInfo: {
    TypeName       : '{i18n>Estoque_titulo}',
    TypeNamePlural : '{i18n>Estoque_titulo_plural}',
    Title          : { Value: nomeProduto },
    Description    : { Value: unidadeNome }
  },

  UI.FieldGroup #Situacao: {
    Data: [
      { $Type: 'UI.DataFieldForAnnotation', Target: '@UI.DataPoint#Cobertura', Label: '{i18n>Estoque_coberturaDias}' },
      { Value: status_code,     Label: '{i18n>Estoque_status}', Criticality: estoqueCriticality },
      { Value: saldoAtual,      Label: '{i18n>Estoque_saldoAtual}' },
      { Value: estoqueMinimo,   Label: '{i18n>Estoque_estoqueMinimo}' },
      { Value: giroMedioDiario, Label: '{i18n>Estoque_giroMedioDiario}' },
      { Value: leadTimeDias,    Label: '{i18n>Estoque_leadTimeDias}' }
    ]
  },

  UI.FieldGroup #Localizacao: {
    Data: [
      { Value: unidadeNome,   Label: '{i18n>Unidades_nome}' },
      { Value: unidadeCidade, Label: '{i18n>Unidades_cidade}' },
      { Value: regiaoCode,    Label: '{i18n>Unidades_regiao}' },
      { Value: clusterCode,   Label: '{i18n>Unidades_cluster}' },
      { Value: sku,           Label: '{i18n>ItensCatalogo_sku}' },
      { Value: categoria,     Label: '{i18n>ItensCatalogo_categoria}' }
    ]
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Situacao',
      Label : '{i18n>Estoque_facetSituacao}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Localizacao',
      Label : '{i18n>Estoque_facetLocalizacao}'
    }
  ]
);
