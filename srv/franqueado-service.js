'use strict';
const cds = require('@sap/cds');
const reposicao = require('./ai/reposicao-agent');

/**
 * Implementação do FranqueadoService (portal do franqueado).
 * Enriquece o MeuEstoque com coberturaDias + estoqueCriticality (sazonalidade
 * regional). Os handlers abaixo são registrados POR ENTIDADE — só afetam
 * MeuEstoque, nunca as demais projeções do serviço.
 */
module.exports = class FranqueadoService extends cds.ApplicationService {
  async init() {
    const { MeuEstoque } = this.entities;

    // Garante que as colunas-base entrem no $select (a cobertura é computada e
    // depende de saldo/giro/leadTime; o FE pede só as colunas visíveis).
    this.before('READ', MeuEstoque, (req) => {
      const cols = req.query?.SELECT?.columns;
      if (Array.isArray(cols)) {
        const nomes = new Set(cols.map(c => c.ref?.[c.ref.length - 1]).filter(Boolean));
        for (const base of ['saldoAtual', 'giroMedioDiario', 'leadTimeDias', 'categoria', 'unidade_ID']) {
          if (!nomes.has(base)) cols.push({ ref: [base] });
        }
      }
    });

    this.after('READ', MeuEstoque, async (rows) => {
      if (!rows) return;
      await reposicao.enriquecerEstoque(this, Array.isArray(rows) ? rows : [rows]);
    });

    return super.init();
  }
};
