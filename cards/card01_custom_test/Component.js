sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "sap/viz/ui5/controls/VizFrame",
  "sap/viz/ui5/data/FlattenedDataset",
  "sap/viz/ui5/controls/common/feeds/FeedItem",
  "sap/m/VBox"
], function (UIComponent, JSONModel, VizFrame, FlattenedDataset, FeedItem, VBox) {
  "use strict";

  return UIComponent.extend("tropicalia.card01.custom.test.Component", {
    metadata: { manifest: "json" },

    createContent: function () {
      this._oModel = new JSONModel({ items: [] });

      this._oViz = new VizFrame({
        uiConfig: { applicationSet: "fiori" },
        vizType: "bar",
        width: "100%",
        height: "220px",
        dataset: new FlattenedDataset({
          data: { path: "/items" },
          dimensions: [{ name: "Type", value: "{type}" }],
          measures: [
            { name: "Critical",  value: "{critical}"  },
            { name: "Attention", value: "{attention}" }
          ]
        }),
        feeds: [
          new FeedItem({ uid: "valueAxis",    type: "Measure",   values: ["Critical", "Attention"] }),
          new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["Type"] })
        ]
      });
      this._oViz.setModel(this._oModel);

      return new VBox({ items: [this._oViz] });
    },

    onCardReady: function (oCard) {
      oCard.request({
        url: "{{destinations.RunMyFranchise-MCP}}/cards/stockout-alerts",
        method: "GET",
        headers: { Accept: "application/json" }
      }).then(function (data) {
        var agg = { Critical: 0, Attention: 0 };
        (data.value || []).forEach(function (row) {
          var label = row.status_label || row.STATUS_LABEL || "";
          var val   = Number(row.revenue_at_risk || row.REVENUE_AT_RISK || 0);
          if (label === "Critical")  agg.Critical  += val;
          if (label === "Attention") agg.Attention += val;
        });
        // Single row with two measures — one bar per measure, each gets its own color
        var items = [{ type: "Revenue at Risk", critical: Math.round(agg.Critical), attention: Math.round(agg.Attention) }];
        this._oModel.setProperty("/items", items);
        this._oViz.setVizProperties({
          plotArea: {
            colorPalette: ["#CC0000", "#FFD600"],
            dataLabel: { visible: true }
          },
          legend:      { visible: false },
          title:       { visible: false },
          categoryAxis: { title: { visible: false } },
          valueAxis:    { title: { visible: false } }
        });
      }.bind(this)).catch(function (e) {
        console.error("card01-custom", e);
      });
    }
  });
});
