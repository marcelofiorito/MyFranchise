sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/m/Page",
  "sap/m/VBox",
  "sap/m/Button",
  "sap/m/Title",
  "sap/m/Text",
  "sap/m/MessageStrip"
], function (UIComponent, Page, VBox, Button, Title, Text, MessageStrip) {
  "use strict";

  return UIComponent.extend("myfranchise.demoAdmin.Component", {
    metadata: { manifest: "json" },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
    },

    createContent: function () {
      var MCP = "https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com";

      function switchScenario(scenario) {
        fetch(MCP + "/admin/switch-scenario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: scenario })
        }).then(function () {
          ms.setText("🟢  GOOD scenario active — SP Jardins stock replenished, NPS recovered.");
          ms.setType("Success");
          ms.setVisible(true);
        }).catch(function (e) {
          ms.setText("Error: " + e.message);
          ms.setType("Error");
          ms.setVisible(true);
        });
      }

      var ms = new MessageStrip({ visible: false, showCloseButton: false });
      var msReset = new MessageStrip({ visible: false, showCloseButton: false });

      function resetBaseline(btn) {
        btn.setEnabled(false);
        ms.setVisible(false);
        fetch(MCP + "/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          msReset.setText("✅  Reset complete — BAD scenario active. " + data.restoredTables + " tables restored (" + data.totalRows + " rows).");
          msReset.setType("Success");
          msReset.setVisible(true);
        }).catch(function (e) {
          msReset.setText("Error: " + e.message);
          msReset.setType("Error");
          msReset.setVisible(true);
        }).finally(function () { btn.setEnabled(true); });
      }

      var btnReset = new Button({
        text: "🔄  Reset to Baseline (BAD scenario)",
        type: "Emphasized",
        width: "280px",
        press: function () { resetBaseline(btnReset); }
      });

      return new Page({
        title: "Demo Admin — Tropicália",
        showNavButton: false,
        content: [
          new VBox({
            class: "sapUiMediumMargin",
            items: [
              new Title({ text: "🔄 Reset Demo", level: "H2",
                           class: "sapUiSmallMarginBottom" }),
              new Text({
                text: "Restores all demo tables to baseline and sets BAD scenario (SP Jardins in crisis). Run before each demo.",
                wrapping: true,
                class: "sapUiSmallMarginBottom sapUiMediumMarginBottom"
              }),
              btnReset,
              msReset,
              new Title({ text: "🟢 Recovery", level: "H3",
                           class: "sapUiMediumMarginTop sapUiSmallMarginBottom" }),
              new Text({
                text: "Switch SP Jardins to GOOD scenario — marks replenishment orders as DELIVERED and restores NPS.",
                wrapping: true, class: "sapUiSmallMarginBottom"
              }),
              new Button({
                text: "🟢  GOOD — Recovery Mode",
                type: "Accept",
                width: "220px",
                press: function () { switchScenario("GOOD"); }
              }),
              ms
            ]
          })
        ]
      });
    }
  });
});

