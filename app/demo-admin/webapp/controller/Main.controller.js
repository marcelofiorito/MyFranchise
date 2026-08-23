sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  const BASE = "./admin-api";

  return Controller.extend("myfranchise.demoAdmin.controller.Main", {

    _api: async function (method, path, body) {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(BASE + path, opts);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      return json;
    },

    _strip: function (text, type) {
      const ms = this.byId("msScenario");
      ms.setText(text);
      ms.setType(type || "Success");
      ms.setVisible(true);
    },

    onScenarioBad:  function () { this._switchScenario("BAD");  },
    onScenarioGood: function () { this._switchScenario("GOOD"); },

    _switchScenario: async function (scenario) {
      ["btnBad", "btnGood"].forEach(id => this.byId(id).setEnabled(false));
      try {
        await this._api("POST", "/admin/switch-scenario", { scenario });
        this._strip(
          scenario === "GOOD"
            ? "GOOD scenario active — SP Jardins stock replenished, NPS recovered."
            : "BAD scenario active — SP Jardins in crisis mode."
        );
      } catch (e) {
        this._strip("Error: " + e.message, "Error");
      } finally {
        ["btnBad", "btnGood"].forEach(id => this.byId(id).setEnabled(true));
      }
    }

  });
});
