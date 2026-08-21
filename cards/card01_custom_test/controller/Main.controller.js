sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("tropicalia.card01.custom.test.controller.Main", {

    onInit: function () {
      this.getView().setModel(new JSONModel({ items: [] }));
    },

    _onCardReady: function (oCard) {
      this._oCard = oCard;
      oCard.request({
        url: "{{destinations.RunMyFranchise-MCP}}/cards/stockout-alerts",
        method: "GET",
        headers: { Accept: "application/json" }
      }).then(function (data) {
        // Aggregate revenue_at_risk by status_label
        var agg = {};
        (data.value || []).forEach(function (row) {
          var label = row.status_label || row.STATUS_LABEL || "Unknown";
          agg[label] = (agg[label] || 0) + Number(row.revenue_at_risk || row.REVENUE_AT_RISK || 0);
        });
        var items = Object.entries(agg).map(function (e) {
          return { status_label: e[0], revenue_at_risk: Math.round(e[1]) };
        });
        this.getView().getModel().setProperty("/items", items);
        this._applyColors();
      }.bind(this)).catch(function (e) {
        console.error("card01-custom fetch error", e);
      });
    },

    _applyColors: function () {
      var oViz = this.byId("vizFrame");
      if (!oViz) return;
      oViz.setVizProperties({
        plotArea: {
          colorPalette: ["#FF5A3C", "#FFCC2E", "#B0B0B0"],
          dataLabel: { visible: true, formatString: ",.0f" }
        },
        legend: { visible: false },
        title: { visible: false },
        categoryAxis: { title: { visible: false } },
        valueAxis: { title: { visible: false } }
      });
    }

  });
});
