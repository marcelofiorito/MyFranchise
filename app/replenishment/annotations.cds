using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// PEDIDOS DE REPOSIÇÃO — List Report + Object Page
// Gestor aprova/recusa pedidos gerados pelo Agente de Reposição.
// ─────────────────────────────────────────────────────────────

annotate service.Pedidos_Reposicao with @(

  // ── Filtros ───────────────────────────────────────────────
  UI.SelectionFields: [ status_code, regiaoCode, origem_code ],

) {
  status @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'StatusPedidoRep',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: status_code, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
  regiaoCode @(
    title: '{i18n>Unidades_regiao}',
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'Regiao',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: regiaoCode, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
  origem @(
    title: '{i18n>PedidoRep_origem}',
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'OrigemPedido',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: origem_code, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
}

annotate service.Pedidos_Reposicao with @(

  // ── DataPoint: urgência com criticality ───────────────────
  UI.DataPoint #Urgencia: {
    Value       : status_code,
    Title       : '{i18n>PedidoRep_status}',
    Criticality : urgenciaCriticality
  },

  // ── Tabela (List Report) ──────────────────────────────────
  UI.LineItem: [
    { Value: unidadeNome,   Label: '{i18n>Unidades_nome}',             ![@UI.Importance]: #High },
    { Value: unidadeCidade, Label: '{i18n>Unidades_cidade}',           ![@UI.Importance]: #Medium },
    { Value: regiaoCode,    Label: '{i18n>Unidades_regiao}',           ![@UI.Importance]: #Medium },
    { Value: nomeProduto,   Label: '{i18n>ItensCatalogo_nomeProduto}', ![@UI.Importance]: #High },
    { Value: sku,           Label: '{i18n>ItensCatalogo_sku}' },
    { Value: qtdSugerida,   Label: '{i18n>PedidoRep_qtdSugerida}',    ![@UI.Importance]: #High },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#Urgencia',
      Label : '{i18n>PedidoRep_status}',
      ![@UI.Importance]: #High
    },
    { Value: origemLabel,    Label: '{i18n>PedidoRep_origem}' },
    { Value: prazoDesejado, Label: '{i18n>PedidoRep_prazoDesejado}' },
    {
      $Type  : 'UI.DataFieldForAction',
      Action : 'FranqueadoraService.Pedidos_Reposicao_aprovar',
      Label  : '{i18n>PedidoRep_aprovar}',
      ![@UI.Importance]: #High
    },
    {
      $Type  : 'UI.DataFieldForAction',
      Action : 'FranqueadoraService.Pedidos_Reposicao_recusar',
      Label  : '{i18n>PedidoRep_recusar}'
    }
  ],

  // ── Object Page ───────────────────────────────────────────
  UI.HeaderInfo: {
    TypeName       : '{i18n>PedidoRep_titulo}',
    TypeNamePlural : '{i18n>PedidoRep_titulo_plural}',
    Title          : { Value: nomeProduto },
    Description    : { Value: unidadeNome }
  },

  UI.FieldGroup #Pedido: {
    Data: [
      { $Type: 'UI.DataFieldForAnnotation', Target: '@UI.DataPoint#Urgencia', Label: '{i18n>PedidoRep_status}' },
      { Value: qtdSugerida,        Label: '{i18n>PedidoRep_qtdSugerida}' },
      { Value: qtdAprovada,        Label: '{i18n>PedidoRep_qtdAprovada}' },
      { Value: fornecedorSugerido, Label: '{i18n>PedidoRep_fornecedor}' },
      { Value: prazoDesejado,      Label: '{i18n>PedidoRep_prazoDesejado}' },
      { Value: origemLabel,            Label: '{i18n>PedidoRep_origem}' }
    ]
  },

  UI.FieldGroup #Loja: {
    Data: [
      { Value: unidadeNome,   Label: '{i18n>Unidades_nome}' },
      { Value: unidadeCidade, Label: '{i18n>Unidades_cidade}' },
      { Value: regiaoCode,    Label: '{i18n>Unidades_regiao}' },
      { Value: sku,           Label: '{i18n>ItensCatalogo_sku}' },
      { Value: nomeProduto,   Label: '{i18n>ItensCatalogo_nomeProduto}' }
    ]
  },

  UI.FieldGroup #Decisao: {
    Data: [
      { Value: aprovador,   Label: '{i18n>PedidoRep_aprovador}' },
      { Value: dataDecisao, Label: '{i18n>PedidoRep_dataDecisao}' }
    ]
  },

  UI.FieldGroup #Justificativa: {
    Data: [
      { Value: justificativa, Label: '{i18n>PedidoRep_justificativa}', ![@UI.MultiLineText]: true }
    ]
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Pedido',
      Label : '{i18n>PedidoRep_facetPedido}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Loja',
      Label : '{i18n>PedidoRep_facetLoja}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Justificativa',
      Label : '{i18n>PedidoRep_facetJustificativa}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Decisao',
      Label : '{i18n>PedidoRep_facetDecisao}'
    }
  ],

  // ── Ações no Object Page ──────────────────────────────────
  UI.Identification: [
    {
      $Type  : 'UI.DataFieldForAction',
      Action : 'FranqueadoraService.aprovarPedido',
      Label  : '{i18n>PedidoRep_aprovar}'
    },
    {
      $Type  : 'UI.DataFieldForAction',
      Action : 'FranqueadoraService.recusarPedido',
      Label  : '{i18n>PedidoRep_recusar}'
    }
  ]
);
