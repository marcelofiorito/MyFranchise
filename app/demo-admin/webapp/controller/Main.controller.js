sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/ListItem"
], function (Controller, MessageToast, ListItem) {
  "use strict";

  const BASE = "./admin-api";

  return Controller.extend("myfranchise.demoAdmin.controller.Main", {

    onInit: function () {
      this._loadStores();
      this._loadOrders();
    },

    // ── helpers ────────────────────────────────────────────────

    _api: async function (method, path, body) {
      const opts = {
        method,
        headers: { "Content-Type": "application/json" }
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(BASE + path, opts);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      return json;
    },

    _strip: function (id, text, type) {
      const ms = this.byId(id);
      ms.setText(text);
      ms.setType(type || "Success");
      ms.setVisible(true);
    },

    _stripError: function (id, e) {
      this._strip(id, "Error: " + e.message, "Error");
    },

    _loadStores: async function () {
      try {
        const data = await this._api("GET", "/admin/stores");
        const stores = data.value || [];
        ["selStockoutStore", "selNpsStore", "selCreateStore"].forEach(id => {
          const sel = this.byId(id);
          sel.destroyItems();
          stores.forEach(s => {
            sel.addItem(new sap.ui.core.Item({
              key: s.store_id || s.STORE_ID,
              text: (s.store_name || s.STORE_NAME) + " — " + (s.city || s.CITY)
            }));
          });
        });
      } catch (e) {
        MessageToast.show("Could not load stores: " + e.message);
      }
    },

    _loadOrders: async function () {
      try {
        const data = await this._api("GET", "/admin/orders");
        const orders = data.value || [];
        const sel = this.byId("selOrder");
        sel.destroyItems();
        orders.forEach(o => {
          const oid   = o.order_id   || o.ORDER_ID;
          const sname = o.store_name || o.STORE_NAME;
          const st    = o.status     || o.STATUS;
          const dt    = o.order_date || o.ORDER_DATE;
          sel.addItem(new sap.ui.core.Item({
            key:  oid,
            text: oid + " · " + sname + " [" + st + "] " + dt
          }));
        });
      } catch (e) {
        MessageToast.show("Could not load orders: " + e.message);
      }
    },

    // ── Reset ──────────────────────────────────────────────────

    onReset: async function () {
      this.byId("btnReset").setEnabled(false);
      try {
        const r = await this._api("POST", "/admin/reset");
        this._strip("msReset",
          "Reset complete. Tables: " + r.restoredTables + " · Total rows: " + r.totalRows);
        await this._loadStores();
        await this._loadOrders();
      } catch (e) {
        this._stripError("msReset", e);
      } finally {
        this.byId("btnReset").setEnabled(true);
      }
    },

    // ── Stockout crisis ────────────────────────────────────────

    onStockoutCrisis: async function () {
      const storeId   = this.byId("selStockoutStore").getSelectedKey();
      const intensity = this.byId("sbIntensity").getSelectedKey() || "high";
      if (!storeId) { MessageToast.show("Select a store first."); return; }
      this.byId("btnStockout").setEnabled(false);
      try {
        const r = await this._api("POST", "/admin/stockout-crisis", { store_id: storeId, intensity });
        this._strip("msStockout", "Stockout crisis applied for store " + storeId + " (intensity: " + r.intensity + ")");
      } catch (e) {
        this._stripError("msStockout", e);
      } finally {
        this.byId("btnStockout").setEnabled(true);
      }
    },

    // ── NPS crisis ─────────────────────────────────────────────

    onNpsCrisis: async function () {
      const storeId  = this.byId("selNpsStore").getSelectedKey();
      const newScore = this.byId("siNpsScore").getValue();
      if (!storeId) { MessageToast.show("Select a store first."); return; }
      this.byId("btnNps").setEnabled(false);
      try {
        const r = await this._api("POST", "/admin/nps-crisis", { store_id: storeId, new_score: newScore });
        this._strip("msNps", "NPS updated for store " + storeId + ": " + r.updated + " responses set to " + newScore);
      } catch (e) {
        this._stripError("msNps", e);
      } finally {
        this.byId("btnNps").setEnabled(true);
      }
    },

    // ── Create order ───────────────────────────────────────────

    onCreateOrder: async function () {
      const storeId = this.byId("selCreateStore").getSelectedKey();
      if (!storeId) { MessageToast.show("Select a store first."); return; }
      this.byId("btnCreate").setEnabled(false);
      try {
        const r = await this._api("POST", "/admin/create-order", { store_id: storeId });
        this._strip("msCreate",
          "Order created: " + r.order_id + " · " + r.items + " items · R$ " + r.total_amount);
        await this._loadOrders();
      } catch (e) {
        this._stripError("msCreate", e);
      } finally {
        this.byId("btnCreate").setEnabled(true);
      }
    },

    // ── Order lifecycle ────────────────────────────────────────

    onApproveOrder:  function () { this._updateOrder("APPROVED");   },
    onDeliverOrder:  function () { this._updateOrder("DELIVERED");  },
    onCancelOrder:   function () { this._updateOrder("CANCELLED");  },

    _updateOrder: async function (status) {
      const orderId = this.byId("selOrder").getSelectedKey();
      if (!orderId) { MessageToast.show("Select an order first."); return; }
      ["btnApprove","btnDeliver","btnCancel"].forEach(id => this.byId(id).setEnabled(false));
      try {
        await this._api("POST", "/admin/update-order", { order_id: orderId, status });
        this._strip("msLifecycle", "Order " + orderId + " → " + status);
        await this._loadOrders();
      } catch (e) {
        this._stripError("msLifecycle", e);
      } finally {
        ["btnApprove","btnDeliver","btnCancel"].forEach(id => this.byId(id).setEnabled(true));
      }
    },

    // ── Scenario switch ───────────────────────────────────────
    onScenarioBad:  function () { this._switchScenario("BAD");  },
    onScenarioGood: function () { this._switchScenario("GOOD"); },

    _switchScenario: async function (scenario) {
      ["btnBad","btnGood"].forEach(id => this.byId(id).setEnabled(false));
      try {
        await this._api("POST", "/admin/switch-scenario", { scenario });
        this._strip("msScenario",
          scenario === "GOOD"
            ? "GOOD scenario active — SP Jardins stock replenished, NPS recovered."
            : "BAD scenario active — SP Jardins in crisis mode.");
      } catch (e) {
        this._stripError("msScenario", e);
      } finally {
        ["btnBad","btnGood"].forEach(id => this.byId(id).setEnabled(true));
      }
    }

  });
});
