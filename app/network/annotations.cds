using FranqueadoraService as service from '../../srv/service';

// ── Value Help on List Report filters ─────────────────────────
annotate service.Saude_Dashboard with {
  regiao_code @(
    title: 'Region',
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'Regiao',
      Parameters    : [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: regiao_code, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
  cluster_code @(
    title: 'Cluster',
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'Cluster',
      Parameters    : [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: cluster_code, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' }
      ]
    }
  );
}

// ═══════════════════════════════════════════════════════════════
// FRANCHISOR NETWORK DASHBOARD — Analytical List Page
// View: Saude_Dashboard  |  contextPath=/Saude_Dashboard
// ═══════════════════════════════════════════════════════════════

annotate service.Saude_Dashboard with @(
  Aggregation.CustomAggregate #scoreSaude    : 'Edm.Decimal',
  Aggregation.CustomAggregate #compliancePct : 'Edm.Decimal',
  Common.SemanticKey : [ID]
) {
  ID               @Analytics.Measure: false  @ID: 'ID';
  scoreSaude       @Aggregation.default: #AVG;
  compliancePct    @Aggregation.default: #AVG;
  scoreCriticality @Common.Text: criticalityText
                   @Common.TextArrangement: #TextOnly;
};

annotate service.Saude_Dashboard with @(

  UI.HeaderInfo: {
    TypeName       : 'Unit',
    TypeNamePlural : 'Network Units',
    Title          : { Value: nome },
    Description    : { Value: cidade }
  },

  UI.SelectionFields: [ regiao_code, cluster_code, scoreCriticality, emReforma ],

  UI.LineItem: [
    { Value: nome,          Label: 'Name'              },
    { Value: cidade,        Label: 'City'              },
    { Value: regiao_code,   Label: 'Region'            },
    { Value: cluster_code,  Label: 'Cluster'           },
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target: '@UI.DataPoint#ScoreSaude',
      Label : 'Health Score'
    },
    { Value: compliancePct,  Label: 'Compliance %'    },
    { Value: performancePct, Label: 'Performance %'   },
    { Value: emReforma,      Label: 'Under Renovation' },
    { Value: qtdAlertasAlta, Label: 'High Alerts'     }
  ],

  UI.DataPoint #ScoreSaude: {
    Value                    : scoreSaude,
    Title                    : 'Health Score',
    Criticality              : scoreCriticality,
    CriticalityRepresentation: #WithIcon,
    CriticalityCalculation   : {
      ImprovementDirection   : #Maximize,
      ToleranceRangeLowValue : 45,
      DeviationRangeLowValue : 0
    }
  },

  Analytics.AggregatedProperty #avgScoreSaude: {
    Name                : 'avgScoreSaude',
    AggregationMethod   : 'average',
    AggregatableProperty: scoreSaude,
    ![@Common.Label]    : 'Avg Health Score'
  },

  UI.PresentationVariant: {
    SortOrder     : [{ Property: scoreSaude, Descending: false }],
    Visualizations: ['@UI.Chart', '@UI.LineItem']
  },

  UI.Chart: {
    Title           : 'Health Score by Region',
    ChartType       : #Bar,
    DynamicMeasures : ['@Analytics.AggregatedProperty#avgScoreSaude'],
    Dimensions      : [ regiao_code ],
    MeasureAttributes: [{
      $Type         : 'UI.ChartMeasureAttributeType',
      DynamicMeasure: '@Analytics.AggregatedProperty#avgScoreSaude',
      Role          : #Axis1
    }],
    DimensionAttributes: [{
      $Type    : 'UI.ChartDimensionAttributeType',
      Dimension: regiao_code,
      Role     : #Category
    }]
  }
);

// ═══════════════════════════════════════════════════════════════
// OBJECT PAGE — Unidades
// ═══════════════════════════════════════════════════════════════

annotate service.Unidades with @(

  UI.HeaderInfo: {
    TypeName       : 'Unit',
    TypeNamePlural : 'Units',
    Title          : { Value: nome },
    Description    : { Value: cidade }
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.FieldGroup#Details',
      Label : 'Details'
    }
  ],

  UI.FieldGroup #Details: {
    Label: 'Unit Details',
    Data: [
      { Value: codigo,       Label: 'Code'         },
      { Value: nome,         Label: 'Name'         },
      { Value: cidade,       Label: 'City'         },
      { Value: estado,       Label: 'State'        },
      { Value: regiao_code,  Label: 'Region'       },
      { Value: cluster_code, Label: 'Cluster'      },
      { Value: franqueado_ID,Label: 'Franchisee'   },
      { Value: dataAbertura, Label: 'Opening Date' },
      { Value: status_code,  Label: 'Status'       },
      { Value: endereco,     Label: 'Address'      }
    ]
  }
);
