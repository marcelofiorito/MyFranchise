'use strict';
const cds = require('@sap/cds');

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

cds.on('bootstrap', (app) => {
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

  // Endpoints de KPI para tiles dinâmicos do Work Zone.
  // O tile espera um número puro em text/plain — OData functions
  // retornam {"value":N} que o launchpad não consegue interpretar.
  app.get('/kpi/ruptura', async (_req, res) => {
    try {
      const db = await cds.connect.to('db');
      const [{ CNT }] = await db.run(
        `SELECT COUNT(*) CNT FROM MYFRANCHISE_ESTOQUE_UNIDADE WHERE STATUS_CODE='RUPTURA'`
      );
      res.json(Number(CNT));
    } catch (e) {
      res.json(0);
    }
  });

  app.get('/kpi/pedidos-pendentes', async (_req, res) => {
    try {
      const db = await cds.connect.to('db');
      const [{ CNT }] = await db.run(
        `SELECT COUNT(*) CNT FROM MYFRANCHISE_PEDIDOS_REPOSICAO WHERE STATUS_CODE='PENDENTE'`
      );
      res.json(Number(CNT));
    } catch (e) {
      res.json(0);
    }
  });
});

module.exports = cds.server;
