using FranqueadoraService as service from '../../srv/service';

// ─────────────────────────────────────────────────────────────
// EXECUTIVE HOME — Overview Page (D1)
// 4 cards: Network Revenue, Today's Highlights, Recent Activities, Network KPIs
// ─────────────────────────────────────────────────────────────

// ── KPI_Rede — Revenue + KPI cards ───────────────────────────
annotate service.KPI_Rede with {
  totalRevenue     @Measures.ISOCurrency: 'BRL';
  netNewRevenue    @Measures.ISOCurrency: 'BRL';
  retentionRevenue @Measures.ISOCurrency: 'BRL';
}

annotate service.KPI_Rede with @(

  UI.HeaderInfo: {
    TypeName      : 'Quarter',
    TypeNamePlural: 'Network Revenue',
    Title         : { Value: periodoLabel },
    Description   : { Value: totalLojas }
  },

  UI.PresentationVariant #ByPeriod: {
    SortOrder     : [{ Property: periodo, Descending: true }],
    Visualizations: ['@UI.LineItem#Revenue']
  },

  // ── Card 0: Revenue (faturamento, net-new, retention, customers, QoQ) ──
  UI.LineItem #Revenue: [
    { Value: periodoLabel,     Label: 'Period'           },
    { Value: totalRevenue,     Label: 'Total Revenue',    ![@UI.Importance]: #High },
    { Value: netNewRevenue,    Label: 'Net-New Revenue',  ![@UI.Importance]: #High },
    { Value: retentionRevenue, Label: 'Retention Revenue'                          },
    { Value: totalCustomers,   Label: 'Total Customers',  ![@UI.Importance]: #High },
    { Value: qoqGrowth,        Label: 'QoQ Growth %',     ![@UI.Importance]: #High }
  ],

  // ── Card 3: KPIs (NPS, Margem, Lojas) ──────────────────────
  UI.LineItem #KPIs: [
    { Value: periodoLabel,   Label: 'Period'            },
    { Value: avgNPS,         Label: 'Avg NPS',           ![@UI.Importance]: #High },
    { Value: avgMargemBruta, Label: 'Avg Gross Margin %',![@UI.Importance]: #High },
    { Value: totalLojas,     Label: 'Active Stores',     ![@UI.Importance]: #High },
    { Value: lojasNovas,     Label: 'New Stores'                                  },
    { Value: lojasEmReforma, Label: 'In Renovation'                               }
  ]
);

// ── Atividades_Rede — Highlights + Activities cards ───────────
annotate service.Atividades_Rede with @(

  UI.HeaderInfo: {
    TypeName      : 'Activity',
    TypeNamePlural: 'Activities',
    Title         : { Value: titulo },
    Description   : { Value: horario }
  },

  UI.DataPoint #Status: {
    Value      : status,
    Title      : 'Status',
    Criticality: statusCriticality
  },

  // ── Card 1: Today's Highlights (reuniões do dia) ────────────
  UI.LineItem #Highlights: [
    { Value: titulo,  Label: 'Activity', ![@UI.Importance]: #High },
    { Value: horario, Label: 'Time',     ![@UI.Importance]: #High },
    { Value: tipo,    Label: 'Type'                               }
  ],

  // ── Card 2: Recent Activities (entregas/aprovações) ─────────
  UI.LineItem #Activities: [
    { Value: titulo,   Label: 'Activity', ![@UI.Importance]: #High },
    { Value: status,   Label: 'Status',   ![@UI.Importance]: #High },
    { Value: descricao,Label: 'Details',  ![@UI.Importance]: #Low  }
  ],

  UI.SelectionVariant #Hoje: {
    Text         : 'Today',
    SelectOptions: [{ PropertyName: tipo, Ranges: [{ Sign: #I, Option: #EQ, Low: 'REUNIAO' }] }]
  },

  UI.SelectionVariant #Abertos: {
    Text         : 'Open items',
    SelectOptions: [{ PropertyName: tipo, Ranges: [{ Sign: #I, Option: #EQ, Low: 'ENTREGA' }] }]
  }
);
