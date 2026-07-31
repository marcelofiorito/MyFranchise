'use strict';
const cds = require('@sap/cds');
const reposicao = require('./ai/reposicao-agent');

/**
 * Default de atributos para o Portal do Franqueado.
 *
 * ⚠️ CONTEXTO (demo Dragons' Den): o IdP é o IAS e a UI do BTP Cockpit
 * não permite fixar valor estático (Static Value) nos atributos da role
 * `Franqueado` — o Source fica travado em "Unrestricted" e o IAS não envia
 * `unidade_ID`/`cluster` na asserção SAML. Sem esses atributos, o
 * @restrict `where unidade_ID = $user.unidade_ID` filtra TUDO → portal vazio.
 *
 * Este middleware roda APÓS o auth e, para um usuário com a role Franqueado
 * que chegou SEM os atributos, injeta os defaults. Se o token um dia trouxer
 * os atributos de verdade (via IAS assertion ou Static Value no Cockpit),
 * eles têm precedência — só preenchemos o que estiver vazio.
 *
 * 🔻 PRODUÇÃO REAL: remover este fallback e mapear os atributos via
 * IAS assertion attributes OU Static Value na role (quando a versão do
 * Cockpit/tenant permitir). O default abaixo aponta para u147 (Loja Porto
 * Alegre, cluster STD) — a mesma unidade usada como exemplo na demo.
 */
const FRANQUEADO_DEFAULTS = { unidade_ID: 'u147', cluster: 'STD' };

cds.on('bootstrap', () => {
  cds.middlewares.add(function franqueado_attrs(req, _res, next) {
    const user = cds.context && cds.context.user;
    if (user && typeof user.is === 'function' && user.is('Franqueado')) {
      user.attr = user.attr || {};
      for (const [key, value] of Object.entries(FRANQUEADO_DEFAULTS)) {
        if (user.attr[key] === undefined || user.attr[key] === null || user.attr[key] === '') {
          user.attr[key] = value;
        }
      }
    }
    next();
  }, { after: 'auth' });
});

/**
 * Enriquecimento de estoque (coberturaDias + estoqueCriticality com sazonalidade
 * regional) para o MeuEstoque do FranqueadoService — que não tem impl próprio.
 * O FranqueadoraService.Estoque_Unidade é tratado no srv/service.js.
 */
cds.on('served', (services) => {
  const franqueado = services.FranqueadoService || cds.services.FranqueadoService;
  if (franqueado && franqueado.entities.MeuEstoque) {
    franqueado.before('READ', 'MeuEstoque', (req) => {
      const cols = req.query?.SELECT?.columns;
      if (Array.isArray(cols)) {
        const nomes = new Set(cols.map(c => c.ref?.[c.ref.length - 1]).filter(Boolean));
        for (const base of ['saldoAtual', 'giroMedioDiario', 'leadTimeDias', 'categoria', 'unidade_ID']) {
          if (!nomes.has(base)) cols.push({ ref: [base] });
        }
      }
    });
    franqueado.after('READ', 'MeuEstoque', async (rows) => {
      if (!rows) return;
      await reposicao.enriquecerEstoque(franqueado, Array.isArray(rows) ? rows : [rows]);
    });
  }
});

module.exports = cds.server;
