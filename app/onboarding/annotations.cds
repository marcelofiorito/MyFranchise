using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// ONBOARDING — List Report Object Page + Draft
// EntitySet: ProcessosOnboarding
// ─────────────────────────────────────────────────────────────

annotate service.ProcessosOnboarding with @(

  UI.HeaderInfo: {
    TypeName       : 'Processo de Onboarding',
    TypeNamePlural : 'Processos de Onboarding',
    Title          : { Value: unidade.nome },
    Description    : { Value: status_code }
  },

  // ── Colunas da lista ──────────────────────────────────────
  UI.LineItem: [
    { Value: unidade.nome,           Label: 'Unidade'           },
    { Value: unidade.cidade,         Label: 'Cidade'            },
    { Value: unidade.cluster_code,   Label: 'Cluster'           },
    { Value: dataInicio,             Label: 'Início'            },
    { Value: dataPrevisaoAbertura,   Label: 'Previsão Abertura' },
    { Value: percentualConclusao,    Label: '% Conclusão'       },
    {
      Value      : status_code,
      Label      : 'Status',
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
      Label : 'Dados Gerais'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: 'tarefas/@UI.LineItem',
      Label : 'Tarefas'
    }
  ],

  UI.FieldGroup #DadosGerais: {
    Data: [
      { Value: unidade.nome,         Label: 'Unidade'            },
      { Value: unidade.cidade,       Label: 'Cidade'             },
      { Value: unidade.cluster_code, Label: 'Cluster'            },
      { Value: dataInicio,           Label: 'Data de Início'     },
      { Value: dataPrevisaoAbertura, Label: 'Previsão Abertura'  },
      { Value: percentualConclusao,  Label: '% Conclusão'        },
      {
        Value      : status_code,
        Label      : 'Status',
        Criticality: statusCriticality
      }
    ]
  }
);

// ── Tarefas — sub-tabela na Object Page ──────────────────────
annotate service.TarefasOnboarding with @(

  UI.LineItem: [
    { Value: etapa.nome,      Label: 'Etapa'       },
    { Value: nome,            Label: 'Tarefa'      },
    { Value: responsavel,     Label: 'Responsável' },
    { Value: dataVencimento,  Label: 'Prazo'       },
    {
      Value      : status_code,
      Label      : 'Status',
      Criticality: tarefaCriticality
    },
    { Value: dataConclusao, Label: 'Concluída em' }
  ],

  UI.HeaderInfo: {
    TypeName      : 'Tarefa',
    TypeNamePlural: 'Tarefas',
    Title         : { Value: nome },
    Description   : { Value: etapa.nome }
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#DetalhesTarefa',
      Label : 'Detalhes'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: 'documentos/@UI.LineItem',
      Label : 'Documentos'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: 'aprovacoes/@UI.LineItem',
      Label : 'Aprovações'
    }
  ],

  UI.FieldGroup #DetalhesTarefa: {
    Data: [
      { Value: nome,           Label: 'Tarefa'       },
      { Value: etapa.nome,     Label: 'Etapa'        },
      { Value: responsavel,    Label: 'Responsável'  },
      { Value: dataVencimento, Label: 'Prazo'        },
      { Value: dataConclusao,  Label: 'Concluída em' },
      { Value: observacao,     Label: 'Observação'   },
      {
        Value      : status_code,
        Label      : 'Status',
        Criticality: tarefaCriticality
      }
    ]
  }
);

// ── Documentos ────────────────────────────────────────────────
annotate service.DocumentosOnboarding with @(
  UI.LineItem: [
    { Value: nome,      Label: 'Documento'   },
    { Value: tipo_code, Label: 'Tipo'        },
    { Value: status_code, Label: 'Status'    },
    { Value: dataEnvio, Label: 'Enviado em'  },
    { Value: comentario,Label: 'Comentário'  }
  ]
);

// ── Aprovações ────────────────────────────────────────────────
annotate service.AprovacoesOnboarding with @(
  UI.LineItem: [
    { Value: aprovador,   Label: 'Aprovador'  },
    { Value: status_code, Label: 'Status'     },
    { Value: dataDecisao, Label: 'Decisão em' },
    { Value: comentario,  Label: 'Comentário' }
  ]
);
