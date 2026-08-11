'use strict';

/**
 * MCP Server — Tropicália Co. RunMyFranchise
 * 7 tools baseadas no modelo de dados central RUNMYFRANCHISE_JG (Juliana Genova).
 * Acesso direto ao HANA Cloud via DBADMIN — cross-schema read-only no JG.
 */

const { McpServer }  = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z }          = require('zod');
const express        = require('express');
const cds            = require('@sap/cds');

const PORT = process.env.PORT || process.env.MCP_PORT || 3001;
const LOG  = cds.log('mcp-server');
const JG   = 'RUNMYFRANCHISE_JG';
const MF   = 'RUNMYFRANCHISE_MF';

const ok  = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const err = (msg)  => ({ isError: true, content: [{ type: 'text', text: JSON.stringify({ error: msg }) }] });

// ── HANA direct connection (DBADMIN) ─────────────────────────────────────────
let _hanaConn = null;
const getHanaConn = async () => {
  if (_hanaConn) {
    try { await new Promise((res, rej) => _hanaConn.exec('SELECT 1 FROM DUMMY', [], (e) => e ? rej(e) : res())); return _hanaConn; }
    catch (_) { _hanaConn = null; }
  }
  const hana = require('@sap/hana-client');
  _hanaConn = hana.createConnection();
  await new Promise((resolve, reject) => {
    _hanaConn.connect({
      host: '70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com',
      port: 443, uid: 'DBADMIN', pwd: process.env.HANA_DBADMIN_PASSWORD,
      encrypt: 'true', sslValidateCertificate: 'false',
    }, (e) => e ? reject(e) : resolve());
  });
  return _hanaConn;
};

const hanaExec = (conn, sql, params = []) => new Promise((resolve, reject) => {
  conn.exec(sql, params, (e, rows) => {
    if (e) return reject(e);
    resolve(rows.map(r => {
      const out = {};
      for (const [k, v] of Object.entries(r)) out[k.toLowerCase()] = v;
      return out;
    }));
  });
});

// ── Store name → ID resolution ────────────────────────────────────────────────
const resolveStore = async (conn, input) => {
  if (!input) return null;
  // Already a store ID (e.g. BR-SP-001)
  if (/^[A-Z]{2}-[A-Z]{2,3}-\d{3}$/.test(input.trim())) return input.trim();
  // Resolve by name
  const rows = await hanaExec(conn,
    `SELECT STORE_ID FROM "${JG}"."CV_DIM_STORE"
     WHERE UPPER(STORE_NAME) LIKE UPPER(?) OR UPPER(CITY) LIKE UPPER(?)`,
    [`%${input}%`, `%${input}%`]
  );
  return rows[0]?.store_id || null;
};

// ── Build MCP server ──────────────────────────────────────────────────────────
function buildServer() {
  const server = new McpServer({ name: 'tropicalia-mcp', version: '2.0.0' });

  // ── SYSTEM PROMPT ────────────────────────────────────────────────────────────
  server.prompt('system', {}, () => ({
    messages: [{
      role: 'assistant', content: { type: 'text', text: `
You are the AI assistant for Tropicália Co., a Brazilian tropical fashion franchise with 7 stores across Brazil, Argentina, USA, and Portugal.

Today is 2026-08-11. Tomorrow (2026-08-12) the "Tropical Summer" campaign launches — this is the critical context for all inventory and demand questions.

You have access to real-time data from the Tropicália Co. HANA Cloud data model. Always use your tools — never say you cannot access data.

Key facts for context:
- Hero store: SP Jardins (BR-SP-001) in São Paulo — highest revenue store
- Critical SKU: Tucano Flip Flop (TCO-FLIP-001) — especially Ipanema Blue sz 37-38
- SP Jardins has only 3 units of Tucano Blue 37-38 left — 2 days to stockout
- NPS at SP Jardins dropped from 9.2 (June) to 5.4 (August) — customers can't find their size
- Buenos Aires (AR-BA-001) has 178 units of Tucano Blue in overstock — transfer opportunity
- Total network revenue at risk: ~R$ 11,200

When asked about stockout, inventory, NPS, sales, or demand — use the tools and present data clearly with emojis for status (🔴 Critical, 🟡 Attention, 🟢 OK).
When presenting replenishment orders, always show line items and ask for confirmation before finalizing.`
      }
    }]
  }));

  // ── TOOL 1: get_stockout_alert ────────────────────────────────────────────────
  server.tool('get_stockout_alert',
    `Returns stockout risk alerts from the Tropicália Co. network.
Shows which SKUs are at risk of running out of stock, with days to stockout and revenue at risk.
Use when asked: "Which stores/SKUs are at risk?", "Show stockout alerts", "What products are running low?", "What is the inventory status?"`,
    {
      store_id: z.string().optional().describe('Store ID (e.g. BR-SP-001) or store name (e.g. "SP Jardins"). Omit for all stores.'),
      status:   z.enum(['critical','attention','all']).optional().describe('critical=R only, attention=Y only, all=both (default).'),
    },
    async ({ store_id, status = 'all' }) => {
      try {
        const conn = await getHanaConn();
        const sid = store_id ? await resolveStore(conn, store_id) : null;
        const statusFilter = status === 'critical' ? `STOCK_STATUS = 'R'`
                           : status === 'attention' ? `STOCK_STATUS = 'Y'`
                           : `STOCK_STATUS IN ('R','Y')`;
        const storeFilter = sid ? `AND STORE_ID = '${sid}'` : '';

        const rows = await hanaExec(conn,
          `SELECT STORE_NAME, CITY, COUNTRY_CODE, ARTICLE_NAME, COLOR, SIZE_VAL,
                  QTY_ON_HAND, QTY_FORECAST, DAYS_TO_STOCKOUT, QTY_SHORTAGE,
                  REVENUE_AT_RISK, STOCK_STATUS, STOCK_STATUS_LABEL,
                  WEATHER_IMPACT_PCT, CAMPAIGN_IMPACT_PCT
           FROM "${JG}"."CV_FACT_INVENTORY"
           WHERE ${statusFilter} ${storeFilter}
           ORDER BY STOCK_STATUS ASC, REVENUE_AT_RISK DESC`
        );

        if (!rows.length) return ok({ message: 'No stockout alerts found.', alerts: [] });

        const critical  = rows.filter(r => r.stock_status === 'R');
        const attention = rows.filter(r => r.stock_status === 'Y');
        const totalRev  = rows.reduce((s, r) => s + Number(r.revenue_at_risk || 0), 0);

        // Group by store for summary
        const byStore = {};
        for (const r of rows) {
          if (!byStore[r.store_name]) byStore[r.store_name] = { critical: 0, attention: 0, rev: 0 };
          if (r.stock_status === 'R') byStore[r.store_name].critical++;
          else byStore[r.store_name].attention++;
          byStore[r.store_name].rev += Number(r.revenue_at_risk || 0);
        }

        return ok({
          summary: {
            total_alerts: rows.length,
            critical: critical.length,
            attention: attention.length,
            total_revenue_at_risk: `R$ ${totalRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            by_store: Object.entries(byStore).map(([name, d]) => ({
              store: name,
              critical: d.critical,
              attention: d.attention,
              revenue_at_risk: `R$ ${d.rev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            })),
          },
          alerts: rows,
        });
      } catch (e) { LOG.error('get_stockout_alert', e); return err(e.message); }
    }
  );

  // ── TOOL 2: get_substitute_suggest ───────────────────────────────────────────
  server.tool('get_substitute_suggest',
    `Returns product substitution suggestions for an out-of-stock SKU at a specific store.
Use when asked: "What can I sell instead of X?", "Suggest alternatives for...", "I don't have size Y, what else can I offer?"
Returns substitutes with similarity %, stock availability at the store, and a ready-to-use sales script.`,
    {
      store_id: z.string().describe('Store ID or name (e.g. "SP Jardins" or "BR-SP-001")'),
      matnr:    z.string().describe('Article number (e.g. TCO-FLIP-001) or article name (e.g. "Tucano Flip Flop")'),
      color:    z.string().describe('Color (e.g. "Ipanema Blue")'),
      size_val: z.string().describe('Size (e.g. "37-38")'),
    },
    async ({ store_id, matnr, color, size_val }) => {
      try {
        const conn = await getHanaConn();
        const sid = await resolveStore(conn, store_id);
        if (!sid) return err(`Store not found: ${store_id}`);

        // Resolve article name to MATNR if needed
        let resolvedMatnr = matnr;
        if (!matnr.match(/^[A-Z]{3}-[A-Z]{3,4}-\d{3}$/)) {
          const art = await hanaExec(conn,
            `SELECT MATNR FROM "${JG}"."CV_DIM_ARTICLE" WHERE UPPER(ARTICLE_NAME) LIKE UPPER(?)`,
            [`%${matnr}%`]
          );
          if (art[0]) resolvedMatnr = art[0].matnr;
        }

        const rows = await hanaExec(conn,
          `SELECT s.TARGET_MATNR, s.TARGET_COLOR, s.TARGET_SIZE,
                  s.SIMILARITY_PCT, s.ACCEPTANCE_RATE, s.PRIORITY, s.SUGGEST_SCRIPT,
                  COALESCE(i.QTY_ON_HAND, 0)   AS qty_available,
                  COALESCE(i.STOCK_STATUS, 'G') AS stock_status,
                  a.ARTICLE_NAME                AS target_article_name
           FROM "${JG}"."M_SUBSTITUTE" s
           LEFT JOIN "${JG}"."T_INVENTORY_SNAPSHOT" i
             ON i.STORE_ID = ? AND i.MATNR = s.TARGET_MATNR
            AND i.COLOR = s.TARGET_COLOR AND i.SIZE_VAL = s.TARGET_SIZE
           LEFT JOIN "${JG}"."CV_DIM_ARTICLE" a ON a.MATNR = s.TARGET_MATNR
           WHERE s.SOURCE_MATNR = ? AND s.SOURCE_COLOR = ? AND s.SOURCE_SIZE = ?
             AND COALESCE(i.QTY_ON_HAND, 0) > 0
           ORDER BY s.PRIORITY ASC`,
          [sid, resolvedMatnr, color, size_val]
        );

        if (!rows.length) return ok({
          message: `No substitutes with available stock found at ${store_id} for ${matnr} ${color} ${size_val}.`,
          substitutes: [],
        });

        return ok({
          requested: { store: store_id, article: matnr, color, size: size_val },
          substitutes: rows,
          tip: 'Use the suggest_script field as a natural sales pitch to the customer.',
        });
      } catch (e) { LOG.error('get_substitute_suggest', e); return err(e.message); }
    }
  );

  // ── TOOL 3: generate_replenishment_order ─────────────────────────────────────
  server.tool('generate_replenishment_order',
    `Generates a replenishment (sell-in) order for all at-risk SKUs at a store.
Calculates quantities needed (shortage + 5-unit safety buffer) and total cost.
Use when asked: "Create a replenishment order for...", "Order stock for store X", "How much would it cost to replenish?"
Always show the order lines and ask for user confirmation before saying the order is placed.`,
    {
      store_id:      z.string().describe('Store ID or name (e.g. "SP Jardins")'),
      snapshot_date: z.string().optional().describe('Reference date YYYY-MM-DD. Defaults to 2026-08-11.'),
    },
    async ({ store_id, snapshot_date = '2026-08-11' }) => {
      try {
        const conn = await getHanaConn();
        const sid = await resolveStore(conn, store_id);
        if (!sid) return err(`Store not found: ${store_id}`);

        const items = await hanaExec(conn,
          `SELECT MATNR, COLOR, SIZE_VAL, ARTICLE_NAME,
                  QTY_ON_HAND, QTY_SHORTAGE, REVENUE_AT_RISK,
                  COST_PRICE, STOCK_STATUS, STOCK_STATUS_LABEL
           FROM "${JG}"."CV_FACT_INVENTORY"
           WHERE STORE_ID = ? AND STOCK_STATUS IN ('R','Y')
           ORDER BY STOCK_STATUS ASC, REVENUE_AT_RISK DESC`,
          [sid]
        );

        if (!items.length) return ok({ message: `No at-risk SKUs found for store ${store_id}.` });

        const lines = items.map(r => ({
          matnr:       r.matnr,
          article:     r.article_name,
          color:       r.color,
          size:        r.size_val,
          status:      r.stock_status_label,
          qty_on_hand: r.qty_on_hand,
          qty_ordered: Number(r.qty_shortage || 0) + 5,
          unit_cost:   Number(r.cost_price || 0),
          line_total:  (Number(r.qty_shortage || 0) + 5) * Number(r.cost_price || 0),
        }));

        const totalAmount = lines.reduce((s, l) => s + l.line_total, 0);
        const orderId = `SI-${snapshot_date.replace(/-/g,'')}-${sid.replace(/-/g,'')}`;

        return ok({
          order_id:           orderId,
          store:              store_id,
          store_id:           sid,
          status:             'DRAFT — awaiting confirmation',
          reference_date:     snapshot_date,
          item_count:         lines.length,
          total_cost:         `R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          estimated_delivery: '2026-08-18 (~7 days from HQ)',
          lines,
          note: 'This is a draft. Confirm to submit to HQ. Consider combining with a Buenos Aires transfer to cover the campaign launch on 2026-08-12.',
        });
      } catch (e) { LOG.error('generate_replenishment_order', e); return err(e.message); }
    }
  );

  // ── TOOL 4: get_demand_forecast ───────────────────────────────────────────────
  server.tool('get_demand_forecast',
    `Returns AI demand forecast for SKUs — including weather, campaign, and seasonality impact factors.
Use when asked: "What is the demand forecast?", "How many units will we sell?", "What is the demand multiplier?", "How does the heat wave affect demand?"`,
    {
      store_id: z.string().optional().describe('Store ID or name. Omit for full network.'),
      matnr:    z.string().optional().describe('Article number or name filter (e.g. "Tucano Flip Flop").'),
    },
    async ({ store_id, matnr }) => {
      try {
        const conn = await getHanaConn();
        const sid = store_id ? await resolveStore(conn, store_id) : null;

        let matFilter = '';
        if (matnr) {
          if (!matnr.match(/^[A-Z]{3}-[A-Z]{3,4}-\d{3}$/)) {
            const art = await hanaExec(conn,
              `SELECT MATNR FROM "${JG}"."CV_DIM_ARTICLE" WHERE UPPER(ARTICLE_NAME) LIKE UPPER(?)`,
              [`%${matnr}%`]
            );
            if (art[0]) matFilter = `AND f.MATNR = '${art[0].matnr}'`;
          } else {
            matFilter = `AND f.MATNR = '${matnr}'`;
          }
        }

        const storeFilter = sid ? `AND f.STORE_ID = '${sid}'` : '';

        const rows = await hanaExec(conn,
          `SELECT f.STORE_NAME, f.CITY, f.ARTICLE_NAME, f.COLOR, f.SIZE_VAL,
                  f.QTY_ON_HAND, f.QTY_FORECAST, f.DAYS_TO_STOCKOUT, f.QTY_SHORTAGE,
                  f.REVENUE_AT_RISK, f.RISK_LABEL, f.DEMAND_MULTIPLIER,
                  f.WEATHER_IMPACT_PCT, f.CAMPAIGN_IMPACT_PCT, f.SEASONALITY_IMPACT_PCT,
                  f.CONFIDENCE_SCORE
           FROM "${JG}"."CV_FACT_FORECAST" f
           WHERE 1=1 ${storeFilter} ${matFilter}
           ORDER BY f.REVENUE_AT_RISK DESC, f.DAYS_TO_STOCKOUT ASC`
        );

        if (!rows.length) return ok({ message: 'No forecast data found.', forecasts: [] });

        // Summary of demand drivers
        const avgWeather  = rows.reduce((s, r) => s + Number(r.weather_impact_pct || 0), 0) / rows.length;
        const avgCampaign = rows.reduce((s, r) => s + Number(r.campaign_impact_pct || 0), 0) / rows.length;
        const avgMult     = rows.reduce((s, r) => s + Number(r.demand_multiplier || 1), 0) / rows.length;

        return ok({
          summary: {
            total_skus_forecasted: rows.length,
            avg_demand_multiplier: avgMult.toFixed(2),
            avg_weather_impact:    `+${avgWeather.toFixed(0)}%`,
            avg_campaign_impact:   `+${avgCampaign.toFixed(0)}%`,
            context: 'Tropical Summer campaign starts 2026-08-12. Heat wave forecast for São Paulo (38°C).',
          },
          forecasts: rows,
        });
      } catch (e) { LOG.error('get_demand_forecast', e); return err(e.message); }
    }
  );

  // ── TOOL 5: get_nps_analysis ──────────────────────────────────────────────────
  server.tool('get_nps_analysis',
    `Returns NPS (Net Promoter Score) analysis for stores, including promoters, detractors, and customer verbatims.
Use when asked: "What is the NPS score?", "How satisfied are customers?", "Why is NPS dropping?", "What are customers saying?"
Correlates NPS with stockout data when both are mentioned.`,
    {
      store_id: z.string().optional().describe('Store ID or name. Omit for all stores.'),
    },
    async ({ store_id }) => {
      try {
        const conn = await getHanaConn();
        const sid = store_id ? await resolveStore(conn, store_id) : null;
        const storeFilter = sid ? `WHERE n.STORE_ID = '${sid}'` : '';

        // NPS by store
        const npsRows = await hanaExec(conn,
          `SELECT n.STORE_NAME, n.STORE_ID,
                  COUNT(*)          AS responses,
                  AVG(n.SCORE)      AS avg_nps,
                  SUM(n.IS_PROMOTER)   AS promoters,
                  SUM(n.IS_PASSIVE)    AS passives,
                  SUM(n.IS_DETRACTOR)  AS detractors
           FROM "${JG}"."CV_FACT_NPS" n
           ${storeFilter}
           GROUP BY n.STORE_NAME, n.STORE_ID
           ORDER BY avg_nps ASC`
        );

        // Verbatims (detractors first)
        const verbFilter = sid ? `WHERE STORE_ID = '${sid}'` : '';
        const verbatims = await hanaExec(conn,
          `SELECT STORE_NAME, SCORE, CATEGORY, VERBATIM, SURVEY_DATE
           FROM "${JG}"."CV_FACT_NPS"
           ${verbFilter}
           ORDER BY SCORE ASC, SURVEY_DATE DESC
           LIMIT 10`
        );

        // Stockout correlation
        const invRows = await hanaExec(conn,
          `SELECT STORE_ID, SUM(REVENUE_AT_RISK) AS rev_at_risk,
                  COUNT(CASE WHEN STOCK_STATUS='R' THEN 1 END) AS critical_skus
           FROM "${JG}"."CV_FACT_INVENTORY"
           WHERE STOCK_STATUS IN ('R','Y')
           GROUP BY STORE_ID`
        );
        const invMap = {};
        for (const r of invRows) invMap[r.store_id] = r;

        const enriched = npsRows.map(r => ({
          ...r,
          avg_nps: Number(r.avg_nps).toFixed(1),
          nps_score: Math.round(((r.promoters - r.detractors) / r.responses) * 100),
          stockout_correlation: invMap[r.store_id] ? {
            revenue_at_risk: `R$ ${Number(invMap[r.store_id].rev_at_risk).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            critical_skus: invMap[r.store_id].critical_skus,
          } : null,
        }));

        return ok({
          nps_by_store: enriched,
          verbatims: verbatims.filter(v => v.verbatim),
          insight: 'SP Jardins NPS dropped from 9.2 (June) to 5.4 (August). 7 of 11 customers are Detractors. Root cause: Tucano Flip Flop stockout — customers cannot find their size.',
        });
      } catch (e) { LOG.error('get_nps_analysis', e); return err(e.message); }
    }
  );

  // ── TOOL 6: get_sellout_summary ───────────────────────────────────────────────
  server.tool('get_sellout_summary',
    `Returns sell-out (POS sales) summary — revenue, top articles, top stores, and campaign performance.
Use when asked: "How much did we sell?", "What is our revenue?", "Which article sells most?", "How is the campaign performing?", "Show me sales data."`,
    {
      store_id:   z.string().optional().describe('Store ID or name. Omit for full network.'),
      article:    z.string().optional().describe('Article name or MATNR filter.'),
      campaign_id: z.string().optional().describe('Campaign ID filter (e.g. CAMP-001).'),
    },
    async ({ store_id, article, campaign_id }) => {
      try {
        const conn = await getHanaConn();
        const sid = store_id ? await resolveStore(conn, store_id) : null;

        const filters = [];
        if (sid)         filters.push(`STORE_ID = '${sid}'`);
        if (campaign_id) filters.push(`CAMPAIGN_ID = '${campaign_id}'`);
        if (article) {
          if (!article.match(/^[A-Z]{3}-[A-Z]{3,4}-\d{3}$/)) {
            const art = await hanaExec(conn,
              `SELECT MATNR FROM "${JG}"."CV_DIM_ARTICLE" WHERE UPPER(ARTICLE_NAME) LIKE UPPER(?)`,
              [`%${article}%`]
            );
            if (art[0]) filters.push(`MATNR = '${art[0].matnr}'`);
          } else {
            filters.push(`MATNR = '${article}'`);
          }
        }
        const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        // Overall totals
        const totals = await hanaExec(conn,
          `SELECT COUNT(DISTINCT RECEIPT_ID) AS receipts,
                  SUM(QTY)                   AS total_qty,
                  SUM(ITEM_NET_AMOUNT)        AS total_revenue,
                  SUM(ITEM_NET_AMOUNT - (COST_PRICE * QTY)) AS total_margin
           FROM "${JG}"."CV_FACT_SELLOUT" ${where}`
        );

        // Top articles
        const topArticles = await hanaExec(conn,
          `SELECT ARTICLE_NAME, SUM(QTY) AS qty, SUM(ITEM_NET_AMOUNT) AS revenue
           FROM "${JG}"."CV_FACT_SELLOUT" ${where}
           GROUP BY ARTICLE_NAME ORDER BY revenue DESC LIMIT 5`
        );

        // Top stores (only if not filtered by store)
        let topStores = [];
        if (!sid) {
          topStores = await hanaExec(conn,
            `SELECT STORE_NAME, CITY, SUM(QTY) AS qty, SUM(ITEM_NET_AMOUNT) AS revenue
             FROM "${JG}"."CV_FACT_SELLOUT" ${where}
             GROUP BY STORE_NAME, CITY ORDER BY revenue DESC LIMIT 5`
          );
        }

        const t = totals[0] || {};
        return ok({
          summary: {
            total_receipts: t.receipts,
            total_units_sold: t.total_qty,
            total_revenue: `R$ ${Number(t.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            total_margin: `R$ ${Number(t.total_margin || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          },
          top_articles: topArticles.map(r => ({
            article: r.article_name,
            qty: r.qty,
            revenue: `R$ ${Number(r.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          })),
          top_stores: topStores.map(r => ({
            store: r.store_name,
            city: r.city,
            qty: r.qty,
            revenue: `R$ ${Number(r.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          })),
        });
      } catch (e) { LOG.error('get_sellout_summary', e); return err(e.message); }
    }
  );

  // ── TOOL 7: get_store_overview ────────────────────────────────────────────────
  server.tool('get_store_overview',
    `Returns a 360° overview of a specific store — inventory status, NPS, recent sales, demand forecast, and active campaigns.
Use whenever the user mentions a store name or store ID alongside any of these intents: overview, summary, situation, status, full picture, tell me about, how is, what is happening, what is going on, show me, or simply asks about the store without specifying a data type.
Examples: "Give me a full overview of SP Jardins", "What is the situation at BR-SP-001?", "How is Buenos Aires doing?", "Tell me about our Miami store", "SP Jardins — what is going on?", "Show me SP Jardins."
This is the primary tool for the demo hero story (SP Jardins stockout crisis).`,
    {
      store_id: z.string().describe('Store ID or name (e.g. "SP Jardins" or "BR-SP-001")'),
    },
    async ({ store_id }) => {
      try {
        const conn = await getHanaConn();
        const sid = await resolveStore(conn, store_id);
        if (!sid) return err(`Store not found: ${store_id}`);

        // Run all queries in parallel
        const [storeInfo, inventory, nps, sales, forecast] = await Promise.all([
          hanaExec(conn, `SELECT * FROM "${JG}"."CV_DIM_STORE" WHERE STORE_ID = ?`, [sid]),
          hanaExec(conn,
            `SELECT ARTICLE_NAME, COLOR, SIZE_VAL, QTY_ON_HAND, DAYS_TO_STOCKOUT,
                    REVENUE_AT_RISK, STOCK_STATUS, STOCK_STATUS_LABEL
             FROM "${JG}"."CV_FACT_INVENTORY"
             WHERE STORE_ID = ? AND STOCK_STATUS IN ('R','Y')
             ORDER BY STOCK_STATUS ASC, REVENUE_AT_RISK DESC`, [sid]),
          hanaExec(conn,
            `SELECT COUNT(*) AS responses, AVG(SCORE) AS avg_nps,
                    SUM(IS_DETRACTOR) AS detractors, SUM(IS_PROMOTER) AS promoters
             FROM "${JG}"."CV_FACT_NPS" WHERE STORE_ID = ?`, [sid]),
          hanaExec(conn,
            `SELECT SUM(ITEM_NET_AMOUNT) AS revenue, SUM(QTY) AS units
             FROM "${JG}"."CV_FACT_SELLOUT" WHERE STORE_ID = ?`, [sid]),
          hanaExec(conn,
            `SELECT ARTICLE_NAME, COLOR, SIZE_VAL, QTY_FORECAST,
                    DAYS_TO_STOCKOUT, DEMAND_MULTIPLIER, RISK_LABEL
             FROM "${JG}"."CV_FACT_FORECAST"
             WHERE STORE_ID = ? ORDER BY REVENUE_AT_RISK DESC LIMIT 5`, [sid]),
        ]);

        const store = storeInfo[0] || {};
        const npsData = nps[0] || {};
        const salesData = sales[0] || {};
        const totalRevAtRisk = inventory.reduce((s, r) => s + Number(r.revenue_at_risk || 0), 0);

        return ok({
          store: {
            store_id:      sid,
            name:          store.store_name,
            city:          store.city,
            region:        store.region,
            country:       store.country_name,
            franchisee:    store.franchisee_name,
            status:        store.status === 'A' ? 'Active' : store.status,
          },
          inventory_alert: {
            at_risk_skus:       inventory.length,
            critical:           inventory.filter(r => r.stock_status === 'R').length,
            attention:          inventory.filter(r => r.stock_status === 'Y').length,
            total_revenue_at_risk: `R$ ${totalRevAtRisk.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            top_risks:          inventory.slice(0, 3),
          },
          nps: {
            avg_score:   npsData.responses > 0 ? Number(npsData.avg_nps).toFixed(1) : 'No data',
            responses:   npsData.responses,
            promoters:   npsData.promoters,
            detractors:  npsData.detractors,
            health:      Number(npsData.avg_nps) >= 8 ? '🟢 Healthy' : Number(npsData.avg_nps) >= 6 ? '🟡 At risk' : '🔴 Critical',
          },
          sales: {
            total_revenue: `R$ ${Number(salesData.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            units_sold: salesData.units,
          },
          demand_forecast: forecast,
          context: 'Tropical Summer campaign launches 2026-08-12. Heat wave forecast (38°C) driving +35% footwear demand.',
        });
      } catch (e) { LOG.error('get_store_overview', e); return err(e.message); }
    }
  );

  return server;
}

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

const TOOLS = [
  'get_stockout_alert',
  'get_substitute_suggest',
  'generate_replenishment_order',
  'get_demand_forecast',
  'get_nps_analysis',
  'get_sellout_summary',
  'get_store_overview',
];

app.get('/health', (_req, res) => res.json({
  status: 'UP',
  service: 'tropicalia-mcp',
  version: '2.0.0',
  model: 'RUNMYFRANCHISE_JG',
  tools: TOOLS,
  tool_count: TOOLS.length,
  timestamp: new Date().toISOString(),
}));

// ── Card REST endpoints (RUNMYFRANCHISE_MF) ───────────────────────────────────
// Retornam JSON OData-compatible: { value: [...] }
// Usados pelos UI Integration Cards no SAP Build Work Zone Advanced.

// card01 — Alertas de Ruptura (Franqueadora — rede toda)
app.get('/cards/stockout-alerts', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT i.STORE_ID, s.STORE_NAME, s.CITY, s.COUNTRY_CODE,
             i.MATNR, k.MAKTX AS ARTICLE_NAME, i.COLOR, i.SIZE_VAL,
             i.QTY_ON_HAND, i.STOCK_STATUS,
             CASE i.STOCK_STATUS WHEN 'R' THEN 'Critical' WHEN 'Y' THEN 'Attention' ELSE 'OK' END AS STATUS_LABEL,
             COALESCE(f.QTY_FORECAST, 0)                      AS QTY_FORECAST,
             COALESCE(f.DAYS_TO_STOCKOUT, 0)                  AS DAYS_TO_STOCKOUT,
             ROUND(COALESCE(f.QTY_FORECAST,0) * COALESCE(p.RETAIL_PRICE,0), 2) AS REVENUE_AT_RISK
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      JOIN "${MF}"."M_STORE" s  ON s.STORE_ID = i.STORE_ID
      JOIN "${MF}"."MARA"    p  ON p.MATNR     = i.MATNR
      JOIN "${MF}"."MAKT"    k  ON k.MATNR     = i.MATNR AND k.SPRAS = 'E' AND k.MANDT = '100'
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID = i.STORE_ID AND f.MATNR = i.MATNR
            AND f.COLOR = i.COLOR AND f.SIZE_VAL = i.SIZE_VAL
      WHERE i.STOCK_STATUS IN ('R','Y')
      ORDER BY i.STOCK_STATUS ASC, REVENUE_AT_RISK DESC
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/stockout-alerts', e); res.status(500).json({ error: e.message }); }
});

// card01 header — contagem de SKUs críticos
app.get('/cards/stockout-count', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT
        SUM(CASE WHEN STOCK_STATUS='R' THEN 1 ELSE 0 END) AS critical,
        SUM(CASE WHEN STOCK_STATUS='Y' THEN 1 ELSE 0 END) AS attention,
        COUNT(*) AS total
      FROM "${MF}"."T_INVENTORY_SNAPSHOT"
      WHERE STOCK_STATUS IN ('R','Y')
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/stockout-count', e); res.status(500).json({ error: e.message }); }
});

// card02 — NPS da Rede (Franqueadora — por loja)
app.get('/cards/nps-summary', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT n.STORE_ID, s.STORE_NAME, s.CITY,
             COUNT(*)                                              AS RESPONSES,
             ROUND(AVG(n.SCORE), 1)                               AS AVG_NPS,
             SUM(CASE WHEN n.SCORE >= 9 THEN 1 ELSE 0 END)        AS PROMOTERS,
             SUM(CASE WHEN n.SCORE <= 6 THEN 1 ELSE 0 END)        AS DETRACTORS,
             CASE
               WHEN AVG(n.SCORE) >= 8 THEN 'Good'
               WHEN AVG(n.SCORE) >= 6 THEN 'Critical'
               ELSE 'Error'
             END AS NPS_STATE
      FROM "${MF}"."T_NPS" n
      JOIN "${MF}"."M_STORE" s ON s.STORE_ID = n.STORE_ID
      GROUP BY n.STORE_ID, s.STORE_NAME, s.CITY
      ORDER BY AVG_NPS ASC
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/nps-summary', e); res.status(500).json({ error: e.message }); }
});

// card02 header — NPS médio da rede
app.get('/cards/nps-avg', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT ROUND(AVG(SCORE), 1) AS avg_nps, COUNT(*) AS total_responses
      FROM "${MF}"."T_NPS"
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/nps-avg', e); res.status(500).json({ error: e.message }); }
});

// card03 — Receita em Risco por Loja (Franqueadora — bar chart)
app.get('/cards/revenue-at-risk', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT i.STORE_ID, s.STORE_NAME,
             SUM(CASE WHEN i.STOCK_STATUS='R' THEN 1 ELSE 0 END) AS CRITICAL_SKUS,
             SUM(CASE WHEN i.STOCK_STATUS='Y' THEN 1 ELSE 0 END) AS ATTENTION_SKUS,
             ROUND(SUM(COALESCE(f.QTY_FORECAST,0) * COALESCE(p.RETAIL_PRICE,0)), 2) AS REVENUE_AT_RISK
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      JOIN "${MF}"."M_STORE" s ON s.STORE_ID = i.STORE_ID
      JOIN "${MF}"."MARA"    p ON p.MATNR     = i.MATNR
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID = i.STORE_ID AND f.MATNR = i.MATNR
            AND f.COLOR = i.COLOR AND f.SIZE_VAL = i.SIZE_VAL
      WHERE i.STOCK_STATUS IN ('R','Y')
      GROUP BY i.STORE_ID, s.STORE_NAME
      ORDER BY REVENUE_AT_RISK DESC
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/revenue-at-risk', e); res.status(500).json({ error: e.message }); }
});

// card03 header — receita total em risco
app.get('/cards/revenue-at-risk-total', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT ROUND(SUM(COALESCE(f.QTY_FORECAST,0) * COALESCE(p.RETAIL_PRICE,0)), 2) AS total_revenue_at_risk,
             SUM(CASE WHEN i.STOCK_STATUS='R' THEN 1 ELSE 0 END) AS critical_skus
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      JOIN "${MF}"."MARA" p ON p.MATNR = i.MATNR
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID=i.STORE_ID AND f.MATNR=i.MATNR
            AND f.COLOR=i.COLOR AND f.SIZE_VAL=i.SIZE_VAL
      WHERE i.STOCK_STATUS IN ('R','Y')
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/revenue-at-risk-total', e); res.status(500).json({ error: e.message }); }
});

// card04 — Meu Estoque (Franqueada — por loja específica)
app.get('/cards/my-inventory', async (req, res) => {
  const store = req.query.store || 'BR-SP-001';
  try {
    const conn = await getHanaConn();
    // header: contagem de itens em risco
    const header = await hanaExec(conn, `
      SELECT SUM(CASE WHEN STOCK_STATUS='R' THEN 1 ELSE 0 END) AS critical,
             SUM(CASE WHEN STOCK_STATUS='Y' THEN 1 ELSE 0 END) AS attention
      FROM "${MF}"."T_INVENTORY_SNAPSHOT"
      WHERE STORE_ID = ? AND STOCK_STATUS IN ('R','Y')
    `, [store]);
    // items: SKUs mais urgentes
    const items = await hanaExec(conn, `
      SELECT i.MATNR, k.MAKTX AS ARTICLE_NAME, i.COLOR, i.SIZE_VAL,
             i.QTY_ON_HAND, i.STOCK_STATUS,
             CASE i.STOCK_STATUS WHEN 'R' THEN 'Critical' WHEN 'Y' THEN 'Attention' ELSE 'OK' END AS STATUS_LABEL,
             CASE i.STOCK_STATUS WHEN 'R' THEN 'Error' WHEN 'Y' THEN 'Warning' ELSE 'Success' END AS STATUS_STATE,
             COALESCE(f.QTY_FORECAST, 0)     AS QTY_FORECAST,
             COALESCE(f.DAYS_TO_STOCKOUT, 0) AS DAYS_TO_STOCKOUT,
             ROUND(COALESCE(f.QTY_FORECAST,0) * COALESCE(p.RETAIL_PRICE,0), 2) AS REVENUE_AT_RISK
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      JOIN "${MF}"."MARA" p ON p.MATNR = i.MATNR
      JOIN "${MF}"."MAKT" k ON k.MATNR = i.MATNR AND k.SPRAS='E' AND k.MANDT='100'
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID=i.STORE_ID AND f.MATNR=i.MATNR
            AND f.COLOR=i.COLOR AND f.SIZE_VAL=i.SIZE_VAL
      WHERE i.STORE_ID = ? AND i.STOCK_STATUS IN ('R','Y')
      ORDER BY i.STOCK_STATUS ASC, REVENUE_AT_RISK DESC
      LIMIT 6
    `, [store]);
    res.json({ summary: header[0] || {}, value: items });
  } catch (e) { LOG.error('cards/my-inventory', e); res.status(500).json({ error: e.message }); }
});

// card05 — Pedidos de Reposição (Franqueada — por loja)
app.get('/cards/my-orders', async (req, res) => {
  const store = req.query.store || 'BR-SP-001';
  try {
    const conn = await getHanaConn();
    const header = await hanaExec(conn, `
      SELECT SUM(CASE WHEN STATUS='PENDING' THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN STATUS='DRAFT'   THEN 1 ELSE 0 END) AS draft
      FROM "${MF}"."T_SELLIN_HDR" WHERE STORE_ID = ?
    `, [store]);
    const orders = await hanaExec(conn, `
      SELECT h.ORDER_ID, h.STORE_ID, h.ORDER_DATE, h.STATUS,
             h.TOTAL_AMOUNT, h.CURRENCY, h.EXPECTED_DELIVERY,
             (SELECT COUNT(*) FROM "${MF}"."T_SELLIN_ITM" i WHERE i.ORDER_ID = h.ORDER_ID) AS ITEM_COUNT,
             CASE h.STATUS
               WHEN 'PENDING'   THEN 'Warning'
               WHEN 'DRAFT'     THEN 'Information'
               WHEN 'DELIVERED' THEN 'Success'
               ELSE 'None'
             END AS STATUS_STATE
      FROM "${MF}"."T_SELLIN_HDR" h
      WHERE h.STORE_ID = ?
      ORDER BY h.ORDER_DATE DESC
      LIMIT 5
    `, [store]);
    res.json({ summary: header[0] || {}, value: orders });
  } catch (e) { LOG.error('cards/my-orders', e); res.status(500).json({ error: e.message }); }
});

// ── MCP endpoint ──────────────────────────────────────────────────────────────
app.all('/mcp', async (req, res) => {
  const method = req.body?.method || '?';
  LOG.info(`MCP ${req.method} — ${method}`);
  const server    = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    LOG.error('MCP transport error', e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

if (require.main === module) {
  cds.connect.to('db').then(() => app.listen(PORT, () => LOG.info(`MCP Server on port ${PORT}`)));
}
