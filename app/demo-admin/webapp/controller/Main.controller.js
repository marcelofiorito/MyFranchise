sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  return Controller.extend("myfranchise.demoAdmin.controller.Main", {

    onInit: function () {},

    onScenarioBad:  function () { this._switch("BAD");  },
    onScenarioGood: function () { this._switch("GOOD"); },

    _switch: function (scenario) {
      var ms = this.byId("msScenario");
      fetch("./admin-api/admin/switch-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario })
      }).then(function () {
        ms.setText(scenario + " active.");
        ms.setType("Success");
        ms.setVisible(true);
      }).catch(function (e) {
        ms.setText("Error: " + e.message);
        ms.setType("Error");
        ms.setVisible(true);
      });
    }

  });
});
