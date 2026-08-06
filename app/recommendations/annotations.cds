using FranqueadoraService as service from '../../srv/service';

// ═══════════════════════════════════════════════════════════════
// D3 — Category Performance Drill-Down
// List Report de KPI_Categoria: margem e receita por categoria/loja
// ═══════════════════════════════════════════════════════════════

annotate service.KPI_Categoria with @(

  UI.HeaderInfo: {
    TypeName      : 'Category',
    TypeNamePlural: 'Categories',
    Title         : { Value: categoria },
    Description   : { Value: unidadeNome }
  },

  UI.SelectionFields: [
    categoria,
    regiaoCode,
    periodo
  ],

  UI.LineItem: [
    { Value: categoria,    Label: 'Category'   },
    { Value: unidadeNome,  Label: 'Store'       },
    { Value: periodo,      Label: 'Period'      },
    { Value: faturamento,  Label: 'Revenue'     },
    {
      $Type              : 'UI.DataFieldForAnnotation',
      Target             : '@UI.DataPoint#MargemBruta',
      Label              : 'Gross Margin %'
    },
    { Value: meta,         Label: 'Margin Target %' },
    { Value: participacao, Label: 'Share %'     },
    { Value: qtdProdutos,  Label: 'SKUs'        }
  ],

  UI.DataPoint #MargemBruta: {
    Value                 : margemBruta,
    Title                 : 'Gross Margin %',
    CriticalityCalculation: {
      ImprovementDirection  : #Maximize,
      ToleranceRangeLowValue: meta,
      DeviationRangeLowValue: 0
    }
  },

  UI.PresentationVariant: {
    SortOrder     : [{ Property: margemBruta, Descending: true }],
    Visualizations: ['@UI.Chart', '@UI.LineItem']
  },

  UI.Chart: {
    Title      : 'Gross Margin by Category',
    ChartType  : #Bar,
    Dimensions : [ categoria ],
    DimensionAttributes: [{
      $Type    : 'UI.ChartDimensionAttributeType',
      Dimension: categoria,
      Role     : #Category
    }],
    Measures   : [ margemBruta ],
    MeasureAttributes: [{
      $Type  : 'UI.ChartMeasureAttributeType',
      Measure: margemBruta,
      Role   : #Axis1
    }]
  }

);
