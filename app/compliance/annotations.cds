using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// GOVERNANÇA & COMPLIANCE — List Report Object Page
// EntitySet: Desvios

// ── ValueHelp nos filtros ─────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────

annotate service.Desvios with @(

  UI.HeaderInfo: {
    TypeName       : '{i18n>Desvios}',
    TypeNamePlural : '{i18n>Desvios_plural}',
    Title          : { Value: nomeProduto },
    Description    : { Value: sku }
  },

  // ── Colunas da lista ──────────────────────────────────────
  UI.LineItem: [
    { Value: unidade.nome,       Label: '{i18n>Unidades_nome}'            },
    { Value: unidade.cidade,     Label: '{i18n>Unidades_cidade}'          },
    { Value: tipo_code,          Label: '{i18n>Alertas_tipo}'             },
    { Value: sku,                Label: '{i18n>Desvios_sku}'              },
    { Value: nomeProduto,        Label: '{i18n>Desvios_nomeProduto}'      },
    { Value: precoAutorizado,    Label: '{i18n>Desvios_precoAutorizado}'  },
    { Value: precoPraticado,     Label: '{i18n>Desvios_precoPraticado}'   },
    { Value: percentualDesvio,   Label: '{i18n>Desvios_percentualDesvio}' },
    {
      Value      : severidade_code,
      Label      : '{i18n>Desvios_severidade}',
      Criticality: severidadeCriticality
    },
    { Value: status_code,        Label: '{i18n>Desvios_status}'           },
    { Value: dataDeteccao,       Label: '{i18n>Desvios_dataDeteccao}'     }
  ],

  // ── Filtros ───────────────────────────────────────────────
  UI.SelectionFields: [
    tipo_code,
    severidade_code,
    status_code,
    unidade_ID
  ],

  // ── Selection Variants ────────────────────────────────────
  UI.SelectionVariant #AltaSeveridade: {
    Text         : '{i18n>lbl_compliance_varAltaSeveridade}',
    SelectOptions: [{
      PropertyName: severidade_code,
      Ranges      : [{ Sign: #I, Option: #EQ, Low: 'ALTA' }]
    }]
  },

  UI.SelectionVariant #SemResposta: {
    Text         : '{i18n>lbl_compliance_varSemResposta}',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [{ Sign: #I, Option: #EQ, Low: 'NOTIFICADO' }]
    }]
  },

  UI.SelectionVariant #Abertos: {
    Text         : '{i18n>lbl_compliance_varAbertos}',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [{ Sign: #I, Option: #EQ, Low: 'ABERTO' }]
    }]
  },

  // ── Object Page ───────────────────────────────────────────
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Comparativo',
      Label : '{i18n>lbl_compliance_facetComparativo}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Unidade',
      Label : '{i18n>lbl_compliance_facetUnidade}'
    },
    {
      $Type        : 'UI.ReferenceFacet',
      Target       : 'notificacoes/@UI.LineItem',
      Label        : '{i18n>lbl_compliance_facetNotificacoes}'
    }
  ],

  UI.FieldGroup #Comparativo: {
    Data: [
      { Value: tipo_code,          Label: '{i18n>Desvios_tipo}'            },
      { Value: sku,                Label: '{i18n>Desvios_sku}'             },
      { Value: nomeProduto,        Label: '{i18n>Desvios_nomeProduto}'     },
      { Value: precoAutorizado,    Label: '{i18n>Desvios_precoAutorizado}' },
      { Value: precoPraticado,     Label: '{i18n>Desvios_precoPraticado}'  },
      { Value: percentualDesvio,   Label: '{i18n>Desvios_percentualDesvio}'},
      {
        Value      : severidade_code,
        Label      : '{i18n>Desvios_severidade}',
        Criticality: severidadeCriticality
      },
      { Value: status_code,        Label: '{i18n>Desvios_status}'          },
      { Value: dataDeteccao,       Label: '{i18n>Desvios_dataDeteccao}'    },
      { Value: dataResolucao,      Label: '{i18n>Desvios_dataResolucao}'   }
    ]
  },

  UI.FieldGroup #Unidade: {
    Data: [
      { Value: unidade.nome,         Label: '{i18n>Unidades_nome}'    },
      { Value: unidade.cidade,       Label: '{i18n>Unidades_cidade}'  },
      { Value: unidade.estado,       Label: '{i18n>Unidades_estado}'  },
      { Value: unidade.cluster_code, Label: '{i18n>Unidades_cluster}' },
      { Value: unidade.regiao_code,  Label: '{i18n>Unidades_regiao}'  }
    ]
  }
);

// ── Notificações (sub-table na Object Page) ───────────────────
annotate service.NotificacoesCompliance with @(
  UI.LineItem: [
    { Value: dataEnvio,          Label: '{i18n>NotificacoesCompliance_dataEnvio}'     },
    { Value: prazoCorrecao,      Label: '{i18n>NotificacoesCompliance_prazoCorrecao}' },
    { Value: status_code,        Label: '{i18n>NotificacoesCompliance_status}'        },
    { Value: comentarioResposta, Label: '{i18n>lbl_compliance_resposta}'              }
  ]
);
