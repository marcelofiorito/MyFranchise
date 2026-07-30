using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// GOVERNANÇA & COMPLIANCE — List Report Object Page
// EntitySet: Desvios
// ─────────────────────────────────────────────────────────────

annotate service.Desvios with @(

  UI.HeaderInfo: {
    TypeName       : 'Desvio',
    TypeNamePlural : 'Desvios de Compliance',
    Title          : { Value: nomeProduto },
    Description    : { Value: sku }
  },

  // ── Colunas da lista ──────────────────────────────────────
  UI.LineItem: [
    { Value: unidade.nome,       Label: 'Unidade'           },
    { Value: unidade.cidade,     Label: 'Cidade'            },
    { Value: tipo_code,          Label: 'Tipo'              },
    { Value: sku,                Label: 'SKU'               },
    { Value: nomeProduto,        Label: 'Produto'           },
    { Value: precoAutorizado,    Label: 'Preço Autorizado'  },
    { Value: precoPraticado,     Label: 'Preço Praticado'   },
    { Value: percentualDesvio,   Label: 'Desvio %'          },
    {
      Value      : severidade_code,
      Label      : 'Severidade',
      Criticality: severidadeCriticality
    },
    { Value: status_code,        Label: 'Status'            },
    { Value: dataDeteccao,       Label: 'Detectado em'      }
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
    Text         : 'Alta Severidade',
    SelectOptions: [{
      PropertyName: severidade_code,
      Ranges      : [{ Sign: #I, Option: #EQ, Low: 'ALTA' }]
    }]
  },

  UI.SelectionVariant #SemResposta: {
    Text         : 'Sem Resposta',
    SelectOptions: [{
      PropertyName: status_code,
      Ranges      : [{ Sign: #I, Option: #EQ, Low: 'NOTIFICADO' }]
    }]
  },

  UI.SelectionVariant #Abertos: {
    Text         : 'Abertos',
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
      Label : 'Comparativo de Preços'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Unidade',
      Label : 'Informações da Unidade'
    },
    {
      $Type        : 'UI.ReferenceFacet',
      Target       : 'notificacoes/@UI.LineItem',
      Label        : 'Notificações'
    }
  ],

  UI.FieldGroup #Comparativo: {
    Data: [
      { Value: tipo_code,          Label: 'Tipo de Desvio'    },
      { Value: sku,                Label: 'SKU'               },
      { Value: nomeProduto,        Label: 'Produto'           },
      { Value: precoAutorizado,    Label: 'Preço Autorizado'  },
      { Value: precoPraticado,     Label: 'Preço Praticado'   },
      { Value: percentualDesvio,   Label: 'Desvio %'          },
      {
        Value      : severidade_code,
        Label      : 'Severidade',
        Criticality: severidadeCriticality
      },
      { Value: status_code,        Label: 'Status'            },
      { Value: dataDeteccao,       Label: 'Detectado em'      },
      { Value: dataResolucao,      Label: 'Resolvido em'      }
    ]
  },

  UI.FieldGroup #Unidade: {
    Data: [
      { Value: unidade.nome,         Label: 'Unidade'  },
      { Value: unidade.cidade,       Label: 'Cidade'   },
      { Value: unidade.estado,       Label: 'Estado'   },
      { Value: unidade.cluster_code, Label: 'Cluster'  },
      { Value: unidade.regiao_code,  Label: 'Região'   }
    ]
  }
);

// ── Notificações (sub-table na Object Page) ───────────────────
annotate service.NotificacoesCompliance with @(
  UI.LineItem: [
    { Value: dataEnvio,          Label: 'Enviada em'    },
    { Value: prazoCorrecao,      Label: 'Prazo'         },
    { Value: status_code,        Label: 'Status'        },
    { Value: comentarioResposta, Label: 'Resposta'      }
  ]
);
