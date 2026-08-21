using FranqueadoraService as service from '../../srv/service';

// ── List Report: columns ──────────────────────────────────────
annotate service.NpsResponses with @(
  UI.LineItem: [
    { Value: STORE_NAME,   Label: 'Store'        },
    { Value: CITY,         Label: 'City'         },
    { Value: REGION,       Label: 'Region'       },
    { Value: SURVEY_DATE,  Label: 'Date'         },
    { Value: SCORE,        Label: 'NPS Score'    },
    {
      Value: NPS_CATEGORY,
      Label: 'Category',
      Criticality: CRITICALITY,
      CriticalityRepresentation: #WithIcon
    },
    { Value: CATEGORY,     Label: 'Feedback Type' },
    { Value: VERBATIM,     Label: 'Comment'      }
  ],

  UI.SelectionFields: [REGION, STORE_NAME, NPS_CATEGORY, SURVEY_DATE],

  UI.HeaderInfo: {
    TypeName:       'NPS Response',
    TypeNamePlural: 'NPS Responses',
    Title:          { Value: STORE_NAME },
    Description:    { Value: SURVEY_DATE }
  },

  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#NpsScore'    },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#NpsCategory' }
  ],

  UI.DataPoint #NpsScore: {
    Value: SCORE,
    Title: 'NPS Score'
  },
  UI.DataPoint #NpsCategory: {
    Value:       NPS_CATEGORY,
    Title:       'Category',
    Criticality: CRITICALITY
  },

  // ── OVP Chart annotations ──────────────────────────────────
  UI.Chart #NpsByStore: {
    Title:               'NPS Score by Store',
    ChartType:           #Bar,
    Dimensions:          [STORE_NAME],
    DimensionAttributes: [{ Dimension: STORE_NAME, Role: #Category }],
    Measures:            [SCORE],
    MeasureAttributes:   [{ Measure: SCORE, Role: #Axis1 }]
  },

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Response Details', Target: '@UI.FieldGroup#Details' }
  ],

  UI.FieldGroup #Details: {
    Data: [
      { Value: NPS_ID,      Label: 'ID'           },
      { Value: STORE_ID,    Label: 'Store Code'   },
      { Value: STORE_NAME,  Label: 'Store'        },
      { Value: CITY,        Label: 'City'         },
      { Value: REGION,      Label: 'Region'       },
      { Value: SCORE,       Label: 'Score'        },
      { Value: CATEGORY,    Label: 'Feedback Type'},
      { Value: VERBATIM,    Label: 'Comment'      }
    ]
  }
);

// ── Field labels & value helps ────────────────────────────────
annotate service.NpsResponses with {
  REGION @(
    Common.Label: 'Region',
    Common.ValueList: {
      CollectionPath: 'NpsResponses',
      Parameters: [{
        $Type: 'Common.ValueListParameterOut',
        LocalDataProperty: REGION,
        ValueListProperty: 'REGION'
      }]
    },
    Common.ValueListWithFixedValues: false
  );
  STORE_NAME @(
    Common.Label: 'Store',
    Common.ValueList: {
      CollectionPath: 'NpsResponses',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',     LocalDataProperty: STORE_NAME, ValueListProperty: 'STORE_NAME' },
        { $Type: 'Common.ValueListParameterDisplay', ValueListProperty: 'CITY'      }
      ]
    }
  );
  NPS_CATEGORY @(
    Common.Label: 'NPS Category',
    Common.ValueList: {
      CollectionPath: 'NpsResponses',
      Parameters: [{
        $Type: 'Common.ValueListParameterOut',
        LocalDataProperty: NPS_CATEGORY,
        ValueListProperty: 'NPS_CATEGORY'
      }]
    },
    Common.ValueListWithFixedValues: true
  );
  SURVEY_DATE  @Common.Label: 'Survey Date';
  SCORE        @Common.Label: 'NPS Score';
  CATEGORY     @Common.Label: 'Feedback Type';
  VERBATIM     @Common.Label: 'Comment';
  CITY         @Common.Label: 'City';
  CRITICALITY  @UI.Hidden;
};
