sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("myfranchise.admin.controller.Main", {

    onInit: function() {
      this._m = new JSONModel({ pendentes: "...", pState: "None", ruptura: "...", log: [] });
      this.getView().setModel(this._m, "admin");
      // O OData V4 model do AppComponent inicializa de forma assíncrona —
      // aguarda o modelo estar disponível antes de chamar bindContext
      const oView = this.getView();
      const fnRefresh = () => {
        if (oView.getModel()) {
          this.onRefresh();
        } else {
          oView.attachModelContextChange(function() { this.onRefresh(); }.bind(this));
        }
      };
      // Pequeno delay para garantir que o AppComponent terminou o init
      setTimeout(fnRefresh, 200);
    },

    _oModel: function() {
      return this.getView().getModel();
    },

    onRefresh: function() {
      const m = this._oModel();
      if (!m) return;
      // pedidosPendentesCount
      const ctxP = m.bindContext("/pedidosPendentesCount(...)");
      ctxP.execute().then(() => {
        const n = ctxP.getBoundContext().getObject().value;
        this._m.setProperty("/pendentes", String(n));
        this._m.setProperty("/pState", n > 0 ? "Error" : "Success");
      }).catch(() => this._m.setProperty("/pendentes", "?"));

      // rupturaCount
      const ctxR = m.bindContext("/rupturaCount(...)");
      ctxR.execute().then(() => {
        const n = ctxR.getBoundContext().getObject().value;
        this._m.setProperty("/ruptura", String(n));
      }).catch(() => this._m.setProperty("/ruptura", "?"));
    },

    onResetarDemo: function() {
      MessageBox.confirm("Resets ALL stocks to healthy (OK) and removes all orders. Agents will be idle until 'Simulate Sales' is pressed. Continue?", {
        title: "Reset Demo",
        onClose: (a) => {
          if (a !== MessageBox.Action.OK) return;
          const ctx = this._oModel().bindContext("/resetarDemo(...)");
          ctx.execute().then(() => {
            const r = ctx.getBoundContext().getObject();
            const msg = r.mensagem || "Demo reset!";
            MessageToast.show(msg);
            this._log("sap-icon://reset", msg);
            this.onRefresh();
          }).catch(e => MessageBox.error("Erro: " + (e.message || String(e))));
        }
      });
    },

    onSimularVendas: function() {
      MessageBox.confirm("Simulates a sales rush that causes stockouts in 5 stores. The Replenishment Agent will be triggered automatically via AEM. Continue?", {
        title: "Simulate Sales Rush",
        onClose: (a) => {
          if (a !== MessageBox.Action.OK) return;
          MessageToast.show("Simulating sales... agents will be triggered via AEM broker");
          const ctx = this._oModel().bindContext("/simularVendas(...)");
          ctx.execute().then(() => {
            const r = ctx.getBoundContext().getObject();
            const msg = r.mensagem || "Sales simulated!";
            MessageToast.show(msg);
            this._log("sap-icon://sales-order", msg);
            this.onRefresh();
          }).catch(e => MessageBox.error("Erro: " + (e.message || String(e))));
        }
      });
    },

    onGerarReposicao: function() {
      MessageToast.show("Gerando pedidos com IA... (~15s)");
      const ctx = this._oModel().bindContext("/gerarReposicaoTodas(...)");
      ctx.execute().then(() => {
        const r = ctx.getBoundContext().getObject();
        const msg = `IA: ${r.pedidos} pedidos, ${r.unidades} lojas (${r.modo})`;
        MessageToast.show(msg);
        this._log("sap-icon://ai", msg);
        this.onRefresh();
      }).catch(e => MessageBox.error("Erro: " + (e.message || String(e))));
    },

    onSimularRecebimento: function() {
      MessageBox.confirm("Marca pedidos APROVADO como RECEBIDO e repõe o saldo no estoque. Continuar?", {
        title: "Simular Recebimento",
        onClose: (a) => {
          if (a !== MessageBox.Action.OK) return;
          const ctx = this._oModel().bindContext("/simularRecebimento(...)");
          ctx.execute().then(() => {
            const r = ctx.getBoundContext().getObject();
            const msg = r.mensagem || "Recebimento simulado!";
            MessageToast.show(msg);
            this._log("sap-icon://shipping-status", msg);
            this.onRefresh();
          }).catch(e => MessageBox.error("Erro: " + (e.message || String(e))));
        }
      });
    },

    onGerarRecomendacoes: function() {
      MessageToast.show("Gerando recomendações com IA... (~30s)");
      const ctx = this._oModel().bindContext("/gerarRecomendacoesTodas(...)");
      ctx.execute().then(() => {
        const r = ctx.getBoundContext().getObject();
        const msg = `IA: ${r.recomendacoes} recomendações, ${r.unidades} lojas (${r.modo})`;
        MessageToast.show(msg);
        this._log("sap-icon://ai", msg);
      }).catch(e => MessageBox.error("Erro: " + (e.message || String(e))));
    },

    _log: function(icon, msg) {
      const log = this._m.getProperty("/log");
      log.unshift({ icon, msg, ts: new Date().toLocaleTimeString("pt-BR") });
      this._m.setProperty("/log", log.slice(0, 20));
    }
  });
});
