using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// ONBOARDING — List Report Object Page + Draft
// EntitySet: ProcessosOnboarding
// ─────────────────────────────────────────────────────────────

annotate service.ProcessosOnboarding with @(

  UI.HeaderInfo: {
    TypeName       : '{i18n>ProcessosOnboarding}',
    TypeNamePlural : '{i18n>ProcessosOnboarding_plural}',
    Title          : { Value: unidade.nome },
    Description    : { Value: status_code }
  },

  // ── Colunas da lista ──────────────────────────────────────
  UI.LineItem: [
    { Value: unidade.nome,           Label: '{i18n>Unidades_nome}'                           },
    { Value: unidade.cidade,         Label: '{i18n>Unidades_cidade}'                         },
    { Value: unidade.cluster_code,   Label: '{i18n>Unidades_cluster}'                        },
    { Value: dataInicio,             Label: '{i18n>ProcessosOnboarding_dataInicio}'           },
    { Value: dataPrevisaoAbertura,   Label: '{i18n>ProcessosOnboarding_dataPrevisaoAbertura}' },
    { Value: percentualConclusao,    Label: '{i18n>ProcessosOnboarding_percentualConclusao}'  },
    {
      Value      : status_code,
      Label      : '{i18n>ProcessosOnboarding_status}',
      Criticality: statusCriticality
    }
  ],

  // ── Filtros ───────────────────────────────────────────────
  UI.SelectionFields: [
    status_code,
    unidade.regiao_code,
    dataPrevisaoAbertura
  ],

  // ── Object Page — Facets ──────────────────────────────────
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#DadosGerais',
      Label : '{i18n>lbl_onboarding_facetDadosGerais}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: 'tarefas/@UI.LineItem',
      Label : '{i18n>TarefasOnboarding_plural}'
    }
  ],

  UI.FieldGroup #DadosGerais: {
    Data: [
      { Value: unidade.nome,         Label: '{i18n>Unidades_nome}'                            },
      { Value: unidade.cidade,       Label: '{i18n>Unidades_cidade}'                          },
      { Value: unidade.cluster_code, Label: '{i18n>Unidades_cluster}'                         },
      { Value: dataInicio,           Label: '{i18n>lbl_onboarding_dataInicio}'                },
      { Value: dataPrevisaoAbertura, Label: '{i18n>ProcessosOnboarding_dataPrevisaoAbertura}'  },
      { Value: percentualConclusao,  Label: '{i18n>ProcessosOnboarding_percentualConclusao}'   },
      {
        Value      : status_code,
        Label      : '{i18n>ProcessosOnboarding_status}',
        Criticality: statusCriticality
      }
    ]
  }
);

// ── Tarefas — sub-tabela na Object Page ──────────────────────
annotate service.TarefasOnboarding with @(

  UI.LineItem: [
    { Value: etapa.nome,      Label: '{i18n>EtapasOnboarding_nome}'               },
    { Value: nome,            Label: '{i18n>TarefasOnboarding_nome}'              },
    { Value: responsavel,     Label: '{i18n>TarefasOnboarding_responsavel}'       },
    { Value: dataVencimento,  Label: '{i18n>NotificacoesCompliance_prazoCorrecao}' },
    {
      Value      : status_code,
      Label      : '{i18n>TarefasOnboarding_status}',
      Criticality: tarefaCriticality
    },
    { Value: dataConclusao, Label: '{i18n>TarefasOnboarding_dataConclusao}' }
  ],

  UI.HeaderInfo: {
    TypeName      : '{i18n>TarefasOnboarding}',
    TypeNamePlural: '{i18n>TarefasOnboarding_plural}',
    Title         : { Value: nome },
    Description   : { Value: etapa.nome }
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#DetalhesTarefa',
      Label : '{i18n>lbl_onboarding_facetDetalhes}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: 'documentos/@UI.LineItem',
      Label : '{i18n>DocumentosOnboarding_plural}'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: 'aprovacoes/@UI.LineItem',
      Label : '{i18n>AprovacoesOnboarding_plural}'
    }
  ],

  UI.FieldGroup #DetalhesTarefa: {
    Data: [
      { Value: nome,           Label: '{i18n>TarefasOnboarding_nome}'              },
      { Value: etapa.nome,     Label: '{i18n>EtapasOnboarding_nome}'               },
      { Value: responsavel,    Label: '{i18n>TarefasOnboarding_responsavel}'       },
      { Value: dataVencimento, Label: '{i18n>NotificacoesCompliance_prazoCorrecao}' },
      { Value: dataConclusao,  Label: '{i18n>TarefasOnboarding_dataConclusao}'     },
      { Value: observacao,     Label: '{i18n>TarefasOnboarding_observacao}'        },
      {
        Value      : status_code,
        Label      : '{i18n>TarefasOnboarding_status}',
        Criticality: tarefaCriticality
      }
    ]
  }
);

// ── Documentos ────────────────────────────────────────────────
annotate service.DocumentosOnboarding with @(
  UI.LineItem: [
    { Value: nome,        Label: '{i18n>DocumentosOnboarding_nome}'     },
    { Value: tipo_code,   Label: '{i18n>DocumentosOnboarding_tipo}'     },
    { Value: status_code, Label: '{i18n>DocumentosOnboarding_status}'   },
    { Value: dataEnvio,   Label: '{i18n>DocumentosOnboarding_dataEnvio}'},
    { Value: comentario,  Label: '{i18n>DocumentosOnboarding_comentario}'}
  ]
);

// ── Aprovações ────────────────────────────────────────────────
annotate service.AprovacoesOnboarding with @(
  UI.LineItem: [
    { Value: aprovador,   Label: '{i18n>AprovacoesOnboarding_aprovador}'   },
    { Value: status_code, Label: '{i18n>AprovacoesOnboarding_status}'      },
    { Value: dataDecisao, Label: '{i18n>AprovacoesOnboarding_dataDecisao}' },
    { Value: comentario,  Label: '{i18n>AprovacoesOnboarding_comentario}'  }
  ]
);
