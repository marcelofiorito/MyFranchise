using FranqueadoraService as service from '../../srv/service';

// ── List Report: columns ──────────────────────────────────────
annotate service.NpsResponses with @(
  UI.LineItem: [
    { Value: STORE_NAME,   Label: 'Loja'         },
    { Value: CITY,         Label: 'Cidade'        },
    { Value: REGION,       Label: 'Região'        },
    { Value: SURVEY_DATE,  Label: 'Data'          },
    { Value: SCORE,        Label: 'NPS Score'     },
    {
      Value: NPS_CATEGORY,
      Label: 'Categoria',
      Criticality: CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    { Value: CATEGORY,     Label: 'Tipo'          },
    { Value: VERBATIM,     Label: 'Comentário'    }
  ],

  UI.SelectionFields: [REGION, STORE_NAME, NPS_CATEGORY, SURVEY_DATE],

  UI.HeaderInfo: {
    TypeName:       'Resposta NPS',
    TypeNamePlural: 'Respostas NPS',
    Title:          { Value: STORE_NAME },
    Description:    { Value: SURVEY_DATE }
  },

  UI.HeaderFacets: [
    {
      $Type:  'UI.ReferenceFacet',
      Target: '@UI.DataPoint#NpsScore'
    },
    {
      $Type:  'UI.ReferenceFacet',
      Target: '@UI.DataPoint#NpsCategory'
    }
  ],

  UI.DataPoint #NpsScore: {
    Value: SCORE,
    Title: 'NPS Score'
  },
  UI.DataPoint #NpsCategory: {
    Value:       NPS_CATEGORY,
    Title:       'Categoria',
    Criticality: CRITICALITY
  },

  UI.Facets: [
    {
      $Type:  'UI.ReferenceFacet',
      Label:  'Detalhes da Resposta',
      Target: '@UI.FieldGroup#Details'
    }
  ],

  UI.FieldGroup #Details: {
    Data: [
      { Value: NPS_ID,      Label: 'ID'           },
      { Value: STORE_ID,    Label: 'Código Loja'  },
      { Value: STORE_NAME,  Label: 'Loja'         },
      { Value: CITY,        Label: 'Cidade'       },
      { Value: REGION,      Label: 'Região'       },
      { Value: SCORE,       Label: 'Pontuação'    },
      { Value: CATEGORY,    Label: 'Tipo'         },
      { Value: VERBATIM,    Label: 'Comentário'   }
    ]
  }
);
