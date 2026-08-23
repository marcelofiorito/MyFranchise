'use strict';

/**
 * MCP Server — Tropicália Co. RunMyFranchise
 * 9 tools aligned with RUNMYFRANCHISE_JG (Juliana Genova) as source of truth.
 * Acesso direto ao HANA Cloud via DBADMIN — cross-schema read-only no JG.
 */

const path = require('path');
const fs   = require('fs');

const BASELINE_DIR = path.join(__dirname, 'data', 'baseline');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { McpServer }  = require('@modelcontextprotocol/sdk/server/mcp.js');
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
  if (/^[A-Z]{2}-[A-Z]{2,3}-\d{3}$/.test(input.trim())) return input.trim();
  const rows = await hanaExec(conn,
    `SELECT STORE_ID FROM "${MF}"."M_STORE"
     WHERE UPPER(STORE_NAME) LIKE UPPER(?) OR UPPER(CITY) LIKE UPPER(?)`,
    [`%${input}%`, `%${input}%`]
  );
  return rows[0]?.store_id || null;
};

// ── Article name → MATNR resolution ──────────────────────────────────────────
const resolveMatnr = async (conn, input) => {
  if (!input) return null;
  if (/^[A-Z]{3}-[A-Z]{3,4}-\d{3}$/.test(input.trim())) return input.trim();
  const rows = await hanaExec(conn,
    `SELECT MATNR FROM "${MF}"."MAKT" WHERE MANDT='100' AND SPRAS='E' AND UPPER(MAKTX) LIKE UPPER(?)`,
    [`%${input}%`]
  );
  return rows[0]?.matnr || null;
};

// ── Common SQL fragments ──────────────────────────────────────────────────────
const SNAP_DATE  = `(SELECT MAX(SNAPSHOT_DATE) FROM "${MF}"."T_INVENTORY_SNAPSHOT")`;
const FCST_DATE  = `(SELECT MAX(FORECAST_DATE) FROM "${MF}"."T_DEMAND_FORECAST")`;

// ── Demo Scenario SQL helpers ─────────────────────────────────────────────────
const DEMO_CJ   = `CROSS JOIN "${MF}"."M_DEMO_STATE" _D`;
const SCENE_I   = `i.SCENARIO = CASE WHEN i.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END`;
const SCENE_F   = `f.SCENARIO = CASE WHEN f.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END`;
const SCENE_N   = `n.SCENARIO = CASE WHEN n.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END`;
const SCENE_HDR = `(h.SCENARIO = 'BAD' OR (h.SCENARIO = 'GOOD' AND h.STORE_ID = 'BR-SP-001' AND _D.ACTIVE_SCENARIO = 'GOOD'))`;

const INVENTORY_COLS = `
  i.STORE_ID, s.STORE_NAME, s.CITY, s.REGION, s.COUNTRY_CODE,
  COALESCE(cnt.COUNTRY_NAME, s.COUNTRY_CODE)   AS COUNTRY_NAME,
  COALESCE(cnt.CURRENCY_CODE, 'BRL')           AS CURRENCY_CODE,
  COALESCE(cnt.HEMISPHERE, '')                 AS HEMISPHERE,
  s.FRANCHISEE_ID,
  COALESCE(fr.NAME, '')                        AS FRANCHISEE_NAME,
  i.MATNR, COALESCE(k.MAKTX, i.MATNR)         AS ARTICLE_NAME,
  COALESCE(maw.ARTGR, '')                      AS CATEGORY_CODE,
  CASE COALESCE(maw.ARTGR,'')
    WHEN 'FTWR' THEN 'Footwear'
    WHEN 'BAGS' THEN 'Bags'
    WHEN 'WSWR' THEN 'Women''s Wear'
    WHEN 'MSWR' THEN 'Men''s Wear'
    WHEN 'ACCS' THEN 'Accessories'
    ELSE COALESCE(maw.ARTGR,'')
  END                                          AS CATEGORY_NAME,
  i.COLOR, i.SIZE_VAL,
  i.QTY_ON_HAND, i.QTY_RESERVED, i.QTY_IN_TRANSIT,
  GREATEST(0, i.QTY_ON_HAND - COALESCE(i.QTY_RESERVED, 0)) AS QTY_AVAILABLE,
  COALESCE(f.QTY_FORECAST, 0)                  AS QTY_FORECAST,
  COALESCE(f.DAYS_TO_STOCKOUT, 0)              AS DAYS_TO_STOCKOUT,
  COALESCE(f.CONFIDENCE_SCORE, 0)              AS CONFIDENCE_SCORE,
  GREATEST(0, COALESCE(f.QTY_FORECAST,0) - i.QTY_ON_HAND) AS QTY_SHORTAGE,
  ROUND(GREATEST(0, COALESCE(f.QTY_FORECAST,0) - i.QTY_ON_HAND) * COALESCE(p.RETAIL_PRICE,0), 2) AS REVENUE_AT_RISK,
  i.STOCK_STATUS,
  CASE i.STOCK_STATUS WHEN 'R' THEN 'Critical' WHEN 'Y' THEN 'Attention' ELSE 'OK' END AS STOCK_STATUS_LABEL,
  COALESCE(f.WEATHER_IMPACT_PCT, 0)            AS WEATHER_IMPACT_PCT,
  COALESCE(f.CAMPAIGN_IMPACT_PCT, 0)           AS CAMPAIGN_IMPACT_PCT,
  COALESCE(w.MAX_TEMP, 0)                      AS WEATHER_MAX_TEMP,
  COALESCE(w."CONDITION", '')                  AS WEATHER_CONDITION,
  COALESCE(w.DEMAND_IMPACT_PCT, 0)             AS LIVE_WEATHER_IMPACT_PCT`;

const INVENTORY_FROM = `
  FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
  JOIN  "${MF}"."M_STORE"      s   ON s.STORE_ID      = i.STORE_ID
  LEFT JOIN "${MF}"."M_COUNTRY"    cnt ON cnt.COUNTRY_CODE = s.COUNTRY_CODE
  LEFT JOIN "${MF}"."M_FRANCHISEE" fr  ON fr.FRANCHISEE_ID = s.FRANCHISEE_ID
  JOIN  "${MF}"."MARA"         p   ON p.MATNR = i.MATNR AND p.MANDT = '100'
  LEFT JOIN "${MF}"."MAKT"     k   ON k.MATNR = i.MATNR AND k.MANDT = '100' AND k.SPRAS = 'E'
  LEFT JOIN "${MF}"."MAW1"     maw ON maw.MATNR = i.MATNR AND maw.MANDT = '100'
  ${DEMO_CJ}
  LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
    ON f.STORE_ID = i.STORE_ID AND f.MATNR = i.MATNR
   AND f.COLOR = i.COLOR AND f.SIZE_VAL = i.SIZE_VAL
   AND f.SCENARIO = i.SCENARIO
  LEFT JOIN "${MF}"."T_EXT_WEATHER" w
    ON w.CITY = s.CITY AND w.FORECAST_DATE = CURRENT_DATE`;

// ── Build MCP server ──────────────────────────────────────────────────────────
function buildServer() {
  const server = new McpServer({ name: 'tropicalia-mcp', version: '2.0.0' });

  // ── SYSTEM PROMPT ────────────────────────────────────────────────────────────
  server.prompt('system', {}, () => ({
    messages: [{
      role: 'assistant', content: { type: 'text', text: `
You are the AI assistant for Tropicália Co., a Brazilian tropical fashion franchise with 7 stores across Brazil, Argentina, USA, and Portugal.

**Language:** Always respond in the same language the user writes in. If the user writes in Portuguese, answer in Portuguese. If in English, answer in English. Both languages are fully supported.

Today is 2026-08-13. The "Tropical Summer" campaign launched yesterday (2026-08-12) — this is the critical context for all inventory and demand questions.

You have access to real-time data from the Tropicália Co. HANA Cloud data model. Always use your tools — never say you cannot access data.

Key facts for context:
- Hero store: SP Jardins (BR-SP-001) in São Paulo — highest revenue store
- Critical SKU: Tucano Flip Flop (TCO-FLIP-001) — especially Ipanema Blue sz 37-38
- SP Jardins has only 3 units of Tucano Blue 37-38 left — 2 days to stockout
- NPS at SP Jardins dropped from 9.2 (June) to 5.4 (August) — customers can't find their size
- Buenos Aires (AR-BA-001) has 178 units of Tucano Blue in overstock — transfer opportunity
- Total network revenue at risk: ~R$ 11,200
- 🌡️ São Paulo is under a Heat Wave today (39°C, +20% demand impact) — this amplifies the stockout urgency

When asked about stockout, inventory, NPS, sales, or demand — use the tools and present data clearly with emojis for status (🔴 Critical, 🟡 Attention, 🟢 OK).
When presenting replenishment orders, always show line items and ask for confirmation before finalizing.

## Tropicália Co. — Schema Context for RUNMYFRANCHISE_JG

### CRITICAL: CV_FACT_SELLOUT revenue aggregation rules
- Use SUM(ITEM_NET_AMOUNT) for revenue — NOT SUM(NET_AMOUNT).
  NET_AMOUNT is the receipt header total and REPEATS on every item row,
  inflating results by ~8x.
- Use COUNT(DISTINCT RECEIPT_ID) for receipt count — NOT COUNT(*).
- Use MAX(TARGET_AMOUNT) for the monthly target — it also repeats per row.
- Achievement % = SUM(ITEM_NET_AMOUNT) / MAX(TARGET_AMOUNT) * 100

### CRITICAL: REVENUE_AT_RISK is pre-computed
- In CV_FACT_INVENTORY and CV_FACT_FORECAST, REVENUE_AT_RISK is already
  calculated as QTY_SHORTAGE × RETAIL_PRICE.
- Read the column value directly. Do NOT compute QTY_FORECAST × RETAIL_PRICE.

### Store IDs
BR-SP-001=SP Jardins, BR-RJ-001=RJ Ipanema, BR-MG-001=BH Savassi,
BR-RS-001=POA Moinhos, AR-BA-001=Buenos Aires Recoleta,
PT-LX-001=Lisboa Chiado, US-FL-001=Miami Beach

### Demo date reference: 2026-08-12 (campaign launch date)`
      }
    }]
  }));

  // ── TOOL 1: get_stockout_alert ────────────────────────────────────────────────
  server.tool('get_stockout_alert',
    `Returns stockout risk alerts for Tropicália Co. stores.
Shows SKUs at risk of running out, with days to stockout, shortage quantity, and revenue at risk.
Use when asked: "Which SKUs are at risk of stockout?", "What is the revenue at risk?", "Show critical stock alerts", "How many products will run out in the next 3 days?", "What is the inventory status?", "Show stockout alerts".
Parameter store_id: store ID (e.g. 'BR-SP-001'). Omit or pass empty string for entire network.
Default demo date: 2026-08-12.
Returns: STORE_NAME, ARTICLE_NAME, MATNR, COLOR, SIZE_VAL, QTY_ON_HAND, QTY_FORECAST, QTY_SHORTAGE, DAYS_TO_STOCKOUT, REVENUE_AT_RISK (pre-computed — do NOT recalculate), STOCK_STATUS (R=Critical, Y=Attention).`,
    {
      store_id: z.string().optional().describe('Store ID (e.g. BR-SP-001) or store name (e.g. "SP Jardins"). Omit for all stores.'),
      status:   z.enum(['critical','attention','all']).optional().describe('critical=R only, attention=Y only, all=both (default).'),
    },
    async ({ store_id, status = 'all' }) => {
      try {
        const conn = await getHanaConn();
        const sid = store_id ? await resolveStore(conn, store_id) : null;
        const statusFilter = status === 'critical' ? `i.STOCK_STATUS = 'R'`
                           : status === 'attention' ? `i.STOCK_STATUS = 'Y'`
                           : `i.STOCK_STATUS IN ('R','Y')`;
        const storeFilter = sid ? `AND i.STORE_ID = '${sid}'` : '';

        const rows = await hanaExec(conn,
          `SELECT ${INVENTORY_COLS} ${INVENTORY_FROM}
           WHERE ${statusFilter}
             AND ${SCENE_I}
             ${storeFilter}
           ORDER BY i.STOCK_STATUS ASC, REVENUE_AT_RISK DESC`
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

        const within3days = rows.filter(r => r.days_to_stockout <= 3).length;

        return ok({
          summary: {
            total_alerts: rows.length,
            critical: critical.length,
            attention: attention.length,
            stockout_within_3_days: within3days,
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
    `Returns product substitution suggestions for an out-of-stock or at-risk SKU at a specific store.
Use when asked: "Is there a substitute for product X?", "Is there a substitute product available for X?", "What alternatives do we have?", "The customer can't find their size — what can I offer?", "Suggest alternatives for...", "What can I sell instead of X?", "Is there a replacement product?", "What are the substitute options?", "Do we have an alternative to X?", "Can you suggest a replacement?".
If color or size are not provided, automatically finds all at-risk variants of the product and returns substitutes for each.
Returns: TARGET_MATNR, TARGET_ARTICLE_NAME, TARGET_COLOR, TARGET_SIZE, SIMILARITY_PCT (>90 = direct substitute), ACCEPTANCE_RATE (historical customer acceptance), QTY_ON_HAND (available at the store), STOCK_STATUS, SUGGEST_SCRIPT (ready-to-use sales pitch).`,
    {
      matnr:    z.string().describe('Article number (e.g. TCO-FLIP-001) or article name (e.g. "Tucano Flip Flop"). Required.'),
      store_id: z.string().optional().describe('Store ID or name (e.g. "SP Jardins"). Omit to search all stores.'),
      color:    z.string().optional().describe('Color (e.g. "Ipanema Blue"). Omit to find substitutes for all at-risk colors.'),
      size_val: z.string().optional().describe('Size (e.g. "37-38"). Omit to find substitutes for all at-risk sizes.'),
    },
    async ({ matnr, store_id, color, size_val }) => {
      try {
        const conn = await getHanaConn();
        const resolvedMatnr = await resolveMatnr(conn, matnr) || matnr;
        const sid = store_id ? await resolveStore(conn, store_id) : null;

        // When color/size not specified, find all at-risk variants of this product
        let variants = [];
        if (!color || !size_val) {
          const storeFilter = sid ? `AND i.STORE_ID = '${sid}'` : '';
          variants = await hanaExec(conn,
            `SELECT DISTINCT i.STORE_ID, i.COLOR, i.SIZE_VAL, i.STOCK_STATUS
             FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
             CROSS JOIN "${MF}"."M_DEMO_STATE" _D
             WHERE i.MATNR = ?
               AND i.STOCK_STATUS IN ('R','Y')
               AND i.SCENARIO = CASE WHEN i.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
               ${storeFilter}
             ORDER BY i.STOCK_STATUS ASC`,
            [resolvedMatnr]
          );
          if (!variants.length) return ok({ message: `No at-risk variants found for ${matnr}.`, results: [] });
        } else {
          variants = [{ store_id: sid || (store_id || ''), color, size_val }];
        }

        const results = [];
        for (const v of variants) {
          const effectiveSid = v.store_id || sid;
          if (!effectiveSid) continue;
          const rows = await hanaExec(conn,
            `SELECT s.TARGET_MATNR, s.TARGET_COLOR, s.TARGET_SIZE,
                    s.SIMILARITY_PCT, s.ACCEPTANCE_RATE, s.PRIORITY, s.SUGGEST_SCRIPT,
                    COALESCE(i.QTY_ON_HAND, 0)                                      AS qty_available,
                    COALESCE(i.STOCK_STATUS, 'N')                                   AS stock_status,
                    CASE WHEN COALESCE(i.QTY_ON_HAND, 0) > 0 THEN 'Y' ELSE 'N' END AS is_available,
                    COALESCE(k.MAKTX, s.TARGET_MATNR)                               AS target_article_name
             FROM "${MF}"."M_SUBSTITUTE" s
             CROSS JOIN "${MF}"."M_DEMO_STATE" _D
             LEFT JOIN "${MF}"."T_INVENTORY_SNAPSHOT" i
               ON i.STORE_ID = ? AND i.MATNR = s.TARGET_MATNR
              AND i.COLOR = s.TARGET_COLOR AND i.SIZE_VAL = s.TARGET_SIZE
              AND i.SCENARIO = CASE WHEN i.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
             LEFT JOIN "${MF}"."MAKT" k
               ON k.MATNR = s.TARGET_MATNR AND k.MANDT = '100' AND k.SPRAS = 'E'
             WHERE s.SOURCE_MATNR = ? AND s.SOURCE_COLOR = ? AND s.SOURCE_SIZE = ?
             ORDER BY s.PRIORITY ASC`,
            [effectiveSid, resolvedMatnr, v.color, v.size_val]
          );
          if (rows.length) results.push({ store: effectiveSid, source_color: v.color, source_size: v.size_val, substitutes: rows });
        }

        if (!results.length) return ok({ message: `No substitutes found for ${matnr}.`, results: [] });
        return ok({
          article: matnr,
          tip: 'Use the suggest_script field as a natural sales pitch to the customer.',
          results,
        });
      } catch (e) { LOG.error('get_substitute_suggest', e); return err(e.message); }
    }
  );

  // ── TOOL 3: get_transfer_suggest ─────────────────────────────────────────────
  server.tool('get_transfer_suggest',
    `Returns inter-store transfer recommendations — fastest way to resolve stockouts without waiting for HQ replenishment.
Finds SKUs at risk at a destination store that can be transferred from another store with surplus.
Use when asked: "Which stores have excess of the products missing in SP Jardins?", "Is there stock available in other stores to cover the shortage?", "Can you check if Buenos Aires has it for transfer?", "Which store can I borrow stock from?", "Can we transfer stock?", "Fastest fix for the stockout".
QTY_SUGGESTED = leaves 5 units at source, covers shortage + safety buffer.
Returns: PRIORITY, FROM_STORE, TO_STORE, ARTICLE_NAME, COLOR, SIZE_VAL, QTY_AT_SOURCE, QTY_SHORTAGE_AT_DEST, QTY_SUGGESTED, REVENUE_SAVED (pre-computed — do NOT recalculate), DAYS_TO_STOCKOUT.`,
    {
      store_id: z.string().optional().describe('Destination store needing stock (ID or name). Omit for all network transfer opportunities.'),
    },
    async ({ store_id }) => {
      try {
        const conn = await getHanaConn();
        const sid = store_id ? await resolveStore(conn, store_id) : null;
        const destFilter = sid ? `AND DEST.STORE_ID = '${sid}'` : '';

        const rows = await hanaExec(conn,
          `SELECT
             ROW_NUMBER() OVER (ORDER BY DEST.STOCK_STATUS ASC,
               ROUND(LEAST(SRC.QTY_ON_HAND - 5,
                 GREATEST(0, COALESCE(DF.QTY_FORECAST,0) - DEST.QTY_ON_HAND) + 5)
                 * M.RETAIL_PRICE, 2) DESC) AS PRIORITY,
             SRC.STORE_ID  AS FROM_STORE_ID,   SS.STORE_NAME AS FROM_STORE_NAME,
             SS.CITY       AS FROM_CITY,        SS.COUNTRY_CODE AS FROM_COUNTRY_CODE,
             DEST.STORE_ID AS TO_STORE_ID,      DS.STORE_NAME AS TO_STORE_NAME,
             DS.CITY       AS TO_CITY,
             DEST.MATNR,  COALESCE(K.MAKTX, DEST.MATNR) AS ARTICLE_NAME,
             DEST.COLOR,  DEST.SIZE_VAL,
             SRC.QTY_ON_HAND AS QTY_AT_SOURCE,
             GREATEST(0, COALESCE(DF.QTY_FORECAST,0) - DEST.QTY_ON_HAND) AS QTY_SHORTAGE_AT_DEST,
             LEAST(SRC.QTY_ON_HAND - 5,
               GREATEST(0, COALESCE(DF.QTY_FORECAST,0) - DEST.QTY_ON_HAND) + 5) AS QTY_SUGGESTED,
             ROUND(LEAST(SRC.QTY_ON_HAND - 5,
               GREATEST(0, COALESCE(DF.QTY_FORECAST,0) - DEST.QTY_ON_HAND) + 5)
               * M.RETAIL_PRICE, 2) AS REVENUE_SAVED,
             DEST.STOCK_STATUS AS STOCK_STATUS_AT_DEST,
             CASE DEST.STOCK_STATUS WHEN 'R' THEN 'Critical' WHEN 'Y' THEN 'Attention' ELSE 'OK' END AS STATUS_LABEL,
             COALESCE(DF.DAYS_TO_STOCKOUT, 0) AS DAYS_TO_STOCKOUT
           FROM "${MF}"."T_INVENTORY_SNAPSHOT" DEST
           CROSS JOIN "${MF}"."M_DEMO_STATE" _D
           JOIN "${MF}"."T_INVENTORY_SNAPSHOT" SRC
             ON SRC.MATNR = DEST.MATNR AND SRC.COLOR = DEST.COLOR AND SRC.SIZE_VAL = DEST.SIZE_VAL
            AND SRC.STORE_ID != DEST.STORE_ID
            AND SRC.STOCK_STATUS = 'G' AND SRC.QTY_ON_HAND > 5
            AND SRC.SCENARIO = CASE WHEN SRC.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
           JOIN "${MF}"."M_STORE" SS ON SS.STORE_ID = SRC.STORE_ID
           JOIN "${MF}"."M_STORE" DS ON DS.STORE_ID = DEST.STORE_ID
           JOIN "${MF}"."MARA"    M  ON M.MATNR = DEST.MATNR AND M.MANDT = '100'
           LEFT JOIN "${MF}"."MAKT" K ON K.MATNR = DEST.MATNR AND K.MANDT = '100' AND K.SPRAS = 'E'
           LEFT JOIN "${MF}"."T_DEMAND_FORECAST" DF
             ON DF.STORE_ID = DEST.STORE_ID AND DF.MATNR = DEST.MATNR
            AND DF.COLOR = DEST.COLOR AND DF.SIZE_VAL = DEST.SIZE_VAL
            AND DF.SCENARIO = DEST.SCENARIO
           WHERE DEST.STOCK_STATUS IN ('R','Y')
             AND DEST.SCENARIO = CASE WHEN DEST.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
             ${destFilter}
           ORDER BY DEST.STOCK_STATUS ASC, REVENUE_SAVED DESC`
        );

        if (!rows.length) return ok({
          message: store_id
            ? `No transfer opportunities for ${store_id}. Either all SKUs are OK or no other store has surplus (QTY>5, STOCK_STATUS=G).`
            : 'No transfer opportunities found across the network.',
          transfers: [],
        });

        const totalRevSaved = rows.reduce((s, r) => s + Number(r.revenue_saved || 0), 0);
        return ok({
          summary: {
            transfer_opportunities: rows.length,
            total_revenue_recoverable: `R$ ${totalRevSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            note: 'Same-city transfers: same-day logistics. Cross-country: 24-48h.',
          },
          transfers: rows,
        });
      } catch (e) { LOG.error('get_transfer_suggest', e); return err(e.message); }
    }
  );

  // ── TOOL 4: generate_replenishment_order ─────────────────────────────────────
  server.tool('generate_replenishment_order',
    `Generates and saves a DRAFT replenishment (sell-in) order for all at-risk SKUs at a store.
Use when asked: "Generate a replenishment order for SP Jardins", "Create a purchase order to cover at-risk SKUs", "What would the replenishment order look like?", "Can you generate the order automatically?".
Calculates ideal quantity (shortage + 5-unit safety buffer), unit value = COST_PRICE (not retail price), saves as DRAFT status (requires human approval before sending to HQ).
Returns: OV_ORDER_ID (format SI-YYYY-NNN), OV_ITEM_COUNT (lines in order), OV_TOTAL_AMOUNT (total in BRL at cost price).
Always show the order lines and ask for user confirmation before calling confirm_replenishment_order.`,
    {
      store_id: z.string().describe('Store ID or name (e.g. "SP Jardins")'),
    },
    async ({ store_id }) => {
      try {
        const conn = await getHanaConn();
        const sid = await resolveStore(conn, store_id);
        if (!sid) return err(`Store not found: ${store_id}`);

        // Currency from M_COUNTRY via M_STORE
        const storeInfo = await hanaExec(conn,
          `SELECT COALESCE(cnt.CURRENCY_CODE, 'BRL') AS CURRENCY_CODE, s.STORE_NAME
           FROM "${MF}"."M_STORE" s
           LEFT JOIN "${MF}"."M_COUNTRY" cnt ON cnt.COUNTRY_CODE = s.COUNTRY_CODE
           WHERE s.STORE_ID = ?`, [sid]);
        const currency = storeInfo[0]?.currency_code || 'BRL';

        const items = await hanaExec(conn,
          `SELECT i.MATNR, COALESCE(k.MAKTX, i.MATNR) AS ARTICLE_NAME,
                  i.COLOR, i.SIZE_VAL, i.QTY_ON_HAND,
                  GREATEST(0, COALESCE(f.QTY_FORECAST,0) - i.QTY_ON_HAND) AS QTY_SHORTAGE,
                  ROUND(GREATEST(0, COALESCE(f.QTY_FORECAST,0) - i.QTY_ON_HAND) * COALESCE(p.RETAIL_PRICE,0), 2) AS REVENUE_AT_RISK,
                  p.COST_PRICE, i.STOCK_STATUS,
                  CASE i.STOCK_STATUS WHEN 'R' THEN 'Critical' WHEN 'Y' THEN 'Attention' ELSE 'OK' END AS STOCK_STATUS_LABEL
           FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
           CROSS JOIN "${MF}"."M_DEMO_STATE" _D
           JOIN  "${MF}"."MARA" p ON p.MATNR = i.MATNR AND p.MANDT = '100'
           LEFT JOIN "${MF}"."MAKT" k ON k.MATNR = i.MATNR AND k.MANDT = '100' AND k.SPRAS = 'E'
           LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID = i.STORE_ID AND f.MATNR = i.MATNR AND f.COLOR = i.COLOR AND f.SIZE_VAL = i.SIZE_VAL
            AND f.SCENARIO = i.SCENARIO
           WHERE i.STORE_ID = ? AND i.STOCK_STATUS IN ('R','Y')
             AND ${SCENE_I}
             AND GREATEST(0, COALESCE(f.QTY_FORECAST,0) - i.QTY_ON_HAND) > 0
           ORDER BY i.STOCK_STATUS ASC, REVENUE_AT_RISK DESC`,
          [sid]
        );

        if (!items.length) return ok({ message: `No at-risk SKUs with shortage found for store ${store_id}.` });

        // Generate ORDER_ID: SI-YYYY-NNN
        const year = new Date().getFullYear();
        const existing = await hanaExec(conn,
          `SELECT MAX(TO_INT(SUBSTR(ORDER_ID, 9))) AS MAXN FROM "${MF}"."T_SELLIN_HDR" WHERE ORDER_ID LIKE 'SI-${year}-%'`);
        const nextN = (Number(existing[0]?.maxn || 0) + 1).toString().padStart(3, '0');
        const orderId = `SI-${year}-${nextN}`;
        const today = new Date().toISOString().substring(0, 10);
        const deliveryDt = new Date(); deliveryDt.setDate(deliveryDt.getDate() + 7);
        const deliveryDate = deliveryDt.toISOString().substring(0, 10);

        const lines = items.map((r, i) => ({
          item_num:    i + 1,
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

        // Delete any previous DRAFT for this store (clean slate)
        await new Promise((ok2, ko) => conn.exec(
          `DELETE FROM "${MF}"."T_SELLIN_ITM" WHERE ORDER_ID IN (SELECT ORDER_ID FROM "${MF}"."T_SELLIN_HDR" WHERE STORE_ID=? AND STATUS='DRAFT')`,
          [sid], e => e ? ko(e) : ok2()));
        await new Promise((ok2, ko) => conn.exec(
          `DELETE FROM "${MF}"."T_SELLIN_HDR" WHERE STORE_ID=? AND STATUS='DRAFT'`,
          [sid], e => e ? ko(e) : ok2()));

        // INSERT DRAFT header
        await new Promise((ok2, ko) => conn.exec(
          `INSERT INTO "${MF}"."T_SELLIN_HDR"
             (ORDER_ID, STORE_ID, ORDER_DATE, STATUS, TOTAL_AMOUNT, CURRENCY, EXPECTED_DELIVERY, NOTES)
           VALUES (?,?,?,?,?,?,?,?)`,
          [orderId, sid, today, 'DRAFT',
           Math.round(totalAmount * 100) / 100, currency, deliveryDate,
           'Generated by Joule Replenishment Agent'],
          e => e ? ko(e) : ok2()));

        // INSERT items
        const stmt = conn.prepare(
          `INSERT INTO "${MF}"."T_SELLIN_ITM"
             (ORDER_ID, ITEM_NUM, MATNR, COLOR, SIZE_VAL, QTY_ORDERED, QTY_DELIVERED, UNIT_PRICE)
           VALUES (?,?,?,?,?,?,?,?)`);
        for (const l of lines) {
          await new Promise((ok2, ko) =>
            stmt.exec([orderId, l.item_num, l.matnr, l.color, l.size,
                       l.qty_ordered, 0, l.unit_cost], e => e ? ko(e) : ok2()));
        }
        await new Promise((ok2, ko) => conn.commit(e => e ? ko(e) : ok2()));

        return ok({
          order_id:           orderId,
          store:              store_id,
          store_id:           sid,
          currency,
          status:             'DRAFT',
          estimated_delivery: deliveryDate,
          item_count:         lines.length,
          total_cost:         `${currency} ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          lines,
          note: `Draft saved as ${orderId}. Review the lines above and confirm to submit to HQ.`,
        });
      } catch (e) { LOG.error('generate_replenishment_order', e); return err(e.message); }
    }
  );

  // ── TOOL 5: confirm_replenishment_order ──────────────────────────────────────
  server.tool('confirm_replenishment_order',
    `Confirms and submits a DRAFT replenishment order to HQ — updates STATUS from DRAFT to PENDING in the database.
Call this AFTER generate_replenishment_order when the user says "confirm", "submit", "place the order", "yes, go ahead", or similar.
The order will appear immediately in the Orders app with status PENDING.`,
    {
      store_id: z.string().optional().describe('Store ID or name (e.g. "SP Jardins") — finds the latest DRAFT order for that store.'),
      order_id: z.string().optional().describe('Specific order ID to confirm (e.g. SI-2026-001). Takes precedence over store_id.'),
    },
    async ({ store_id, order_id }) => {
      try {
        const conn = await getHanaConn();

        let targetOrderId = order_id;
        if (!targetOrderId) {
          if (!store_id) return err('Provide store_id or order_id.');
          const sid = await resolveStore(conn, store_id);
          if (!sid) return err(`Store not found: ${store_id}`);
          const drafts = await hanaExec(conn,
            `SELECT ORDER_ID FROM "${MF}"."T_SELLIN_HDR"
             WHERE STORE_ID=? AND STATUS='DRAFT'
             ORDER BY ORDER_DATE DESC LIMIT 1`, [sid]);
          if (!drafts.length) return err(`No DRAFT order found for ${store_id}. Run generate_replenishment_order first.`);
          targetOrderId = drafts[0].order_id;
        }

        // Verify it exists and is DRAFT
        const hdr = await hanaExec(conn,
          `SELECT ORDER_ID, STORE_ID, TOTAL_AMOUNT, CURRENCY, EXPECTED_DELIVERY,
                  (SELECT COUNT(*) FROM "${MF}"."T_SELLIN_ITM" WHERE ORDER_ID=h.ORDER_ID) AS ITEM_COUNT
           FROM "${MF}"."T_SELLIN_HDR" h WHERE ORDER_ID=? AND STATUS='DRAFT'`,
          [targetOrderId]);
        if (!hdr.length) return err(`Order ${targetOrderId} not found or not in DRAFT status.`);

        const today = new Date().toISOString().substring(0, 10);
        await new Promise((ok2, ko) => conn.exec(
          `UPDATE "${MF}"."T_SELLIN_HDR" SET STATUS='PENDING', ORDER_DATE=? WHERE ORDER_ID=?`,
          [today, targetOrderId], e => e ? ko(e) : ok2()));
        await new Promise((ok2, ko) => conn.commit(e => e ? ko(e) : ok2()));

        const h = hdr[0];
        return ok({
          order_id:          targetOrderId,
          store_id:          h.store_id,
          currency:          h.currency,
          status:            'PENDING',
          order_date:        today,
          expected_delivery: h.expected_delivery ? String(h.expected_delivery).substring(0,10) : null,
          item_count:        h.item_count,
          total_cost:        `${h.currency} ${Number(h.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          message:           `Order ${targetOrderId} submitted to HQ. Estimated delivery ${h.expected_delivery ? String(h.expected_delivery).substring(0,10) : 'TBD'}. Tracking available in the Orders app.`,
        });
      } catch (e) { LOG.error('confirm_replenishment_order', e); return err(e.message); }
    }
  );

  // ── TOOL 6: get_demand_forecast ───────────────────────────────────────────────
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
        const resolvedMatnr = matnr ? await resolveMatnr(conn, matnr) : null;

        const storeFilter = sid ? `AND f.STORE_ID = '${sid}'` : '';
        const matFilter   = resolvedMatnr ? `AND f.MATNR = '${resolvedMatnr}'` : '';

        const rows = await hanaExec(conn,
          `SELECT s.STORE_NAME, s.CITY, COALESCE(k.MAKTX, f.MATNR) AS ARTICLE_NAME,
                  f.COLOR, f.SIZE_VAL,
                  COALESCE(i.QTY_ON_HAND, 0)          AS QTY_ON_HAND,
                  COALESCE(i.STOCK_STATUS, 'G')        AS RISK_STATUS,
                  CASE COALESCE(i.STOCK_STATUS,'G')
                    WHEN 'R' THEN 'Critical' WHEN 'Y' THEN 'Attention' ELSE 'OK' END AS RISK_LABEL,
                  f.QTY_FORECAST, f.DAYS_TO_STOCKOUT,
                  GREATEST(0, f.QTY_FORECAST - COALESCE(i.QTY_ON_HAND,0)) AS QTY_SHORTAGE,
                  ROUND(f.QTY_FORECAST * COALESCE(p.RETAIL_PRICE,0), 2) AS REVENUE_AT_RISK,
                  ROUND(1.0 + (COALESCE(f.WEATHER_IMPACT_PCT,0) + COALESCE(f.CAMPAIGN_IMPACT_PCT,0) +
                        COALESCE(f.SEASONALITY_IMPACT_PCT,0)) / 100, 2) AS DEMAND_MULTIPLIER,
                  f.WEATHER_IMPACT_PCT, f.CAMPAIGN_IMPACT_PCT, f.SEASONALITY_IMPACT_PCT,
                  f.CONFIDENCE_SCORE
           FROM "${MF}"."T_DEMAND_FORECAST" f
           CROSS JOIN "${MF}"."M_DEMO_STATE" _D
           JOIN  "${MF}"."M_STORE" s ON s.STORE_ID = f.STORE_ID
           JOIN  "${MF}"."MARA"    p ON p.MATNR = f.MATNR AND p.MANDT = '100'
           LEFT JOIN "${MF}"."MAKT" k ON k.MATNR = f.MATNR AND k.MANDT = '100' AND k.SPRAS = 'E'
           LEFT JOIN "${MF}"."T_INVENTORY_SNAPSHOT" i
             ON i.STORE_ID = f.STORE_ID AND i.MATNR = f.MATNR AND i.COLOR = f.COLOR AND i.SIZE_VAL = f.SIZE_VAL
            AND i.SCENARIO = f.SCENARIO
           WHERE ${SCENE_F}
             ${storeFilter} ${matFilter}
           ORDER BY REVENUE_AT_RISK DESC, f.DAYS_TO_STOCKOUT ASC`
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
            context: 'Tropical Summer campaign launched 2026-08-12. Heat wave in São Paulo today (39°C, +20% demand).',
          },
          forecasts: rows,
        });
      } catch (e) { LOG.error('get_demand_forecast', e); return err(e.message); }
    }
  );

  // ── TOOL 7: get_nps_analysis ──────────────────────────────────────────────────
  server.tool('get_nps_analysis',
    `Returns NPS (Net Promoter Score) analysis for stores, including promoters, detractors, and customer verbatims.
Use when asked: "What is the NPS score?", "How satisfied are customers?", "Why is NPS dropping?", "What are customers saying?", "What is the store NPS?", "What is the NPS this month?", "What are customers complaining about?", "What are the customer complaints?", "What is the customer feedback?", "Are customers happy?", "What do customers think about the store?", "Show me the NPS for SP Jardins", "Customer satisfaction at my store", "What feedback have customers given?"
Correlates NPS with stockout data when both are mentioned.`,
    {
      store_id: z.string().optional().describe('Store ID or name. Omit for all stores.'),
    },
    async ({ store_id }) => {
      try {
        const conn = await getHanaConn();
        const sid = store_id ? await resolveStore(conn, store_id) : null;
        const storeFilter = sid ? `AND n.STORE_ID = '${sid}'` : '';
        const verbFilter  = sid ? `AND n.STORE_ID = '${sid}'` : '';

        const npsRows = await hanaExec(conn,
          `SELECT n.STORE_ID, s.STORE_NAME,
                  COUNT(*)   AS responses,
                  AVG(n.SCORE) AS avg_nps,
                  SUM(CASE WHEN n.SCORE >= 9 THEN 1 ELSE 0 END) AS promoters,
                  SUM(CASE WHEN n.SCORE >= 7 AND n.SCORE < 9 THEN 1 ELSE 0 END) AS passives,
                  SUM(CASE WHEN n.SCORE < 7  THEN 1 ELSE 0 END) AS detractors
           FROM "${MF}"."T_NPS" n
           CROSS JOIN "${MF}"."M_DEMO_STATE" _D
           JOIN "${MF}"."M_STORE" s ON s.STORE_ID = n.STORE_ID
           WHERE ${SCENE_N} ${storeFilter}
           GROUP BY n.STORE_ID, s.STORE_NAME
           ORDER BY avg_nps ASC`
        );

        const verbatims = await hanaExec(conn,
          `SELECT s.STORE_NAME, n.SCORE,
                  CASE WHEN n.SCORE >= 9 THEN 'Promoter' WHEN n.SCORE >= 7 THEN 'Passive' ELSE 'Detractor' END AS CATEGORY,
                  CASE WHEN n.SCORE >= 9 THEN 1 ELSE 0 END AS IS_PROMOTER,
                  CASE WHEN n.SCORE >= 7 AND n.SCORE < 9 THEN 1 ELSE 0 END AS IS_PASSIVE,
                  CASE WHEN n.SCORE < 7  THEN 1 ELSE 0 END AS IS_DETRACTOR,
                  CASE WHEN n.SCORE >= 9 THEN 'P' WHEN n.SCORE >= 7 THEN 'N' ELSE 'D' END AS NPS_SEGMENT,
                  n.VERBATIM, n.SURVEY_DATE
           FROM "${MF}"."T_NPS" n
           CROSS JOIN "${MF}"."M_DEMO_STATE" _D
           JOIN "${MF}"."M_STORE" s ON s.STORE_ID = n.STORE_ID
           WHERE ${SCENE_N} ${verbFilter}
           ORDER BY n.SCORE ASC, n.SURVEY_DATE DESC
           LIMIT 10`
        );

        const invRows = await hanaExec(conn,
          `SELECT i.STORE_ID,
                  SUM(ROUND(CASE WHEN f.QTY_FORECAST > i.QTY_ON_HAND
                                 THEN (f.QTY_FORECAST - i.QTY_ON_HAND) * COALESCE(p.RETAIL_PRICE,0)
                                 ELSE 0 END,2)) AS rev_at_risk,
                  COUNT(CASE WHEN i.STOCK_STATUS='R' THEN 1 END) AS critical_skus
           FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
           CROSS JOIN "${MF}"."M_DEMO_STATE" _D
           JOIN "${MF}"."MARA" p ON p.MATNR = i.MATNR AND p.MANDT='100'
           LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID=i.STORE_ID AND f.MATNR=i.MATNR AND f.COLOR=i.COLOR AND f.SIZE_VAL=i.SIZE_VAL
            AND f.SCENARIO = i.SCENARIO
           WHERE i.STOCK_STATUS IN ('R','Y')
             AND ${SCENE_I}
           GROUP BY i.STORE_ID`
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
          insight: npsRows.length > 0 && npsRows[0].store_id ?
            `${npsRows[0].store_name} has the lowest NPS at ${npsRows[0].avg_nps}. ${npsRows[0].detractors} of ${npsRows[0].responses} customers are Detractors. ${npsRows[0].stockout_correlation ? `Revenue at risk: ${npsRows[0].stockout_correlation.revenue_at_risk} (${npsRows[0].stockout_correlation.critical_skus} critical SKUs).` : ''}`
            : 'No NPS data available.',
        });
      } catch (e) { LOG.error('get_nps_analysis', e); return err(e.message); }
    }
  );

  // ── TOOL 8: get_sellout_summary ───────────────────────────────────────────────
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
        const resolvedMatnr = article ? await resolveMatnr(conn, article) : null;

        const hdrFilters = [];
        if (sid)         hdrFilters.push(`h.STORE_ID = '${sid}'`);
        if (campaign_id) hdrFilters.push(`h.CAMPAIGN_ID = '${campaign_id}'`);
        const itmFilters = [...hdrFilters];
        if (resolvedMatnr) itmFilters.push(`it.MATNR = '${resolvedMatnr}'`);

        const hdrWhere = hdrFilters.length ? `WHERE ${hdrFilters.join(' AND ')}` : '';
        const itmWhere = itmFilters.length ? `WHERE ${itmFilters.join(' AND ')}` : '';

        const totals = await hanaExec(conn,
          `SELECT COUNT(DISTINCT h.RECEIPT_ID) AS receipts,
                  SUM(it.QTY)                  AS total_qty,
                  SUM(it.NET_AMOUNT)            AS total_revenue,
                  SUM(it.NET_AMOUNT - COALESCE(p.COST_PRICE,0) * it.QTY) AS total_margin
           FROM "${MF}"."T_SELLOUT_HDR" h
           JOIN "${MF}"."T_SELLOUT_ITM" it ON it.RECEIPT_ID = h.RECEIPT_ID
           LEFT JOIN "${MF}"."MARA" p ON p.MATNR = it.MATNR AND p.MANDT = '100'
           ${itmWhere}`
        );

        const topArticles = await hanaExec(conn,
          `SELECT COALESCE(k.MAKTX, it.MATNR) AS ARTICLE_NAME,
                  SUM(it.QTY) AS qty, SUM(it.NET_AMOUNT) AS revenue
           FROM "${MF}"."T_SELLOUT_HDR" h
           JOIN "${MF}"."T_SELLOUT_ITM" it ON it.RECEIPT_ID = h.RECEIPT_ID
           LEFT JOIN "${MF}"."MAKT" k ON k.MATNR = it.MATNR AND k.MANDT = '100' AND k.SPRAS = 'E'
           ${itmWhere}
           GROUP BY COALESCE(k.MAKTX, it.MATNR)
           ORDER BY revenue DESC LIMIT 5`
        );

        let topStores = [];
        if (!sid) {
          topStores = await hanaExec(conn,
            `SELECT s.STORE_NAME, s.CITY, SUM(it.QTY) AS qty, SUM(it.NET_AMOUNT) AS revenue
             FROM "${MF}"."T_SELLOUT_HDR" h
             JOIN "${MF}"."T_SELLOUT_ITM" it ON it.RECEIPT_ID = h.RECEIPT_ID
             JOIN "${MF}"."M_STORE" s ON s.STORE_ID = h.STORE_ID
             ${itmWhere}
             GROUP BY s.STORE_NAME, s.CITY
             ORDER BY revenue DESC LIMIT 5`
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

  // ── TOOL 9: get_store_overview ────────────────────────────────────────────────
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
        const [storeInfo, inventory, nps, sales, forecast, weather, verbatims] = await Promise.all([
          hanaExec(conn,
            `SELECT s.STORE_ID, s.STORE_NAME, s.CITY, s.REGION, s.COUNTRY_CODE,
                    COALESCE(cnt.COUNTRY_NAME, s.COUNTRY_CODE) AS COUNTRY_NAME,
                    COALESCE(cnt.CURRENCY_CODE, 'BRL')         AS CURRENCY_CODE,
                    fr.NAME AS FRANCHISEE_NAME, s.STATUS
             FROM "${MF}"."M_STORE" s
             LEFT JOIN "${MF}"."M_COUNTRY" cnt ON cnt.COUNTRY_CODE = s.COUNTRY_CODE
             LEFT JOIN "${MF}"."M_FRANCHISEE" fr ON fr.FRANCHISEE_ID = s.FRANCHISEE_ID
             WHERE s.STORE_ID = ?`, [sid]),
          hanaExec(conn,
            `SELECT COALESCE(k.MAKTX, i.MATNR) AS ARTICLE_NAME, i.COLOR, i.SIZE_VAL,
                    i.QTY_ON_HAND, COALESCE(f.DAYS_TO_STOCKOUT,0) AS DAYS_TO_STOCKOUT,
                    ROUND(COALESCE(f.QTY_FORECAST,0)*COALESCE(p.RETAIL_PRICE,0),2) AS REVENUE_AT_RISK,
                    i.STOCK_STATUS,
                    CASE i.STOCK_STATUS WHEN 'R' THEN 'Critical' WHEN 'Y' THEN 'Attention' ELSE 'OK' END AS STOCK_STATUS_LABEL
             FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
             CROSS JOIN "${MF}"."M_DEMO_STATE" _D
             JOIN "${MF}"."MARA" p ON p.MATNR=i.MATNR AND p.MANDT='100'
             LEFT JOIN "${MF}"."MAKT" k ON k.MATNR=i.MATNR AND k.MANDT='100' AND k.SPRAS='E'
             LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
               ON f.STORE_ID=i.STORE_ID AND f.MATNR=i.MATNR AND f.COLOR=i.COLOR AND f.SIZE_VAL=i.SIZE_VAL
              AND f.SCENARIO=i.SCENARIO
             WHERE i.STORE_ID=? AND i.STOCK_STATUS IN ('R','Y')
               AND i.SCENARIO = CASE WHEN i.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
             ORDER BY i.STOCK_STATUS ASC, REVENUE_AT_RISK DESC`, [sid]),
          hanaExec(conn,
            `SELECT COUNT(*) AS responses, AVG(SCORE) AS avg_nps,
                    SUM(CASE WHEN SCORE < 7  THEN 1 ELSE 0 END) AS detractors,
                    SUM(CASE WHEN SCORE >= 9 THEN 1 ELSE 0 END) AS promoters
             FROM "${MF}"."T_NPS" CROSS JOIN "${MF}"."M_DEMO_STATE" _D
             WHERE STORE_ID=? AND SCENARIO = CASE WHEN STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END`, [sid]),
          hanaExec(conn,
            `SELECT SUM(h.NET_AMOUNT) AS revenue, SUM(it.QTY) AS units
             FROM "${MF}"."T_SELLOUT_HDR" h
             CROSS JOIN "${MF}"."M_DEMO_STATE" _D
             JOIN "${MF}"."T_SELLOUT_ITM" it ON it.RECEIPT_ID=h.RECEIPT_ID
             WHERE h.STORE_ID=? AND ${SCENE_HDR}`, [sid]),
          hanaExec(conn,
            `SELECT COALESCE(k.MAKTX, f.MATNR) AS ARTICLE_NAME, f.COLOR, f.SIZE_VAL,
                    f.QTY_FORECAST, f.DAYS_TO_STOCKOUT,
                    ROUND(1.0+(COALESCE(f.WEATHER_IMPACT_PCT,0)+COALESCE(f.CAMPAIGN_IMPACT_PCT,0)+
                          COALESCE(f.SEASONALITY_IMPACT_PCT,0))/100,2) AS DEMAND_MULTIPLIER,
                    CASE WHEN f.DAYS_TO_STOCKOUT<=2 THEN 'Urgent' WHEN f.DAYS_TO_STOCKOUT<=5 THEN 'High' ELSE 'Medium' END AS URGENCY
             FROM "${MF}"."T_DEMAND_FORECAST" f
             CROSS JOIN "${MF}"."M_DEMO_STATE" _D
             JOIN "${MF}"."MARA" p ON p.MATNR=f.MATNR AND p.MANDT='100'
             LEFT JOIN "${MF}"."MAKT" k ON k.MATNR=f.MATNR AND k.MANDT='100' AND k.SPRAS='E'
             WHERE f.STORE_ID=? AND f.SCENARIO = CASE WHEN f.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
             ORDER BY ROUND(f.QTY_FORECAST*COALESCE(p.RETAIL_PRICE,0),2) DESC LIMIT 5`, [sid]),
          hanaExec(conn,
            `SELECT w."CITY", w."FORECAST_DATE", w."MAX_TEMP", w."MIN_TEMP",
                    w."CONDITION", w."HEAT_INDEX", w."DEMAND_IMPACT_PCT"
             FROM "${MF}"."T_EXT_WEATHER" w
             WHERE w.CITY = (SELECT CITY FROM "${MF}"."M_STORE" WHERE STORE_ID=?)
               AND w.FORECAST_DATE = CURRENT_DATE`, [sid]),
          hanaExec(conn,
            `SELECT n.SCORE, n.CATEGORY, n.VERBATIM, n.SURVEY_DATE
             FROM "${MF}"."T_NPS" n
             CROSS JOIN "${MF}"."M_DEMO_STATE" _D
             WHERE n.STORE_ID=? AND n.SCORE <= 6
               AND n.SCENARIO = CASE WHEN n.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
             ORDER BY n.SCORE ASC, n.SURVEY_DATE DESC LIMIT 5`, [sid]),
        ]);

        const store = storeInfo[0] || {};
        const npsData = nps[0] || {};
        const salesData = sales[0] || {};
        const weatherData = weather[0] || null;
        const totalRevAtRisk = inventory.reduce((s, r) => s + Number(r.revenue_at_risk || 0), 0);

        return ok({
          store: {
            store_id:      sid,
            name:          store.store_name,
            city:          store.city,
            region:        store.region,
            country:       store.country_name || store.country_code,
            franchisee:    store.franchisee_name,
            status:        store.status === 'A' ? 'Active' : store.status,
          },
          weather_today: weatherData ? {
            city:           weatherData.city,
            max_temp:       `${Math.round(weatherData.max_temp)}°C`,
            condition:      weatherData.condition,
            demand_impact:  `+${Number(weatherData.demand_impact_pct).toFixed(0)}%`,
            alert:          weatherData.condition === 'Heat Wave' || weatherData.condition === 'Very Hot'
                              ? `🌡️ ${weatherData.condition.toUpperCase()} — demand surge expected`
                              : null,
          } : null,
          inventory_alert: {
            at_risk_skus:       inventory.length,
            critical:           inventory.filter(r => r.stock_status === 'R').length,
            attention:          inventory.filter(r => r.stock_status === 'Y').length,
            total_revenue_at_risk: `R$ ${totalRevAtRisk.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            top_risks:          inventory.slice(0, 3),
          },
          nps: {
            avg_score:   npsData.responses > 0 ? Number(npsData.avg_nps).toFixed(1) : 'No data',
            nps_score:   npsData.responses > 0 ? Math.round((Number(npsData.promoters) - Number(npsData.detractors)) / Number(npsData.responses) * 100) : 'No data',
            responses:   npsData.responses,
            promoters:   npsData.promoters,
            detractors:  npsData.detractors,
            health:      Number(npsData.avg_nps) >= 8 ? '🟢 Healthy' : Number(npsData.avg_nps) >= 6 ? '🟡 At risk' : '🔴 Critical',
            top_complaints: verbatims.map(v => ({ score: v.score, category: v.category, comment: v.verbatim })),
          },
          sales: {
            total_revenue: `R$ ${Number(salesData.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            units_sold: salesData.units,
          },
          demand_forecast: forecast,
          context: 'Tropical Summer campaign launched 2026-08-12. Heat wave in São Paulo (39°C today, +20% demand impact).',
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
  'get_transfer_suggest',
  'generate_replenishment_order',
  'confirm_replenishment_order',
  'get_demand_forecast',
  'get_nps_analysis',
  'get_sellout_summary',
  'get_store_overview',
];

app.get('/health', (_req, res) => res.json({
  status: 'UP',
  service: 'tropicalia-mcp',
  version: '2.0.0',
  model: 'RUNMYFRANCHISE_MF',
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
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."M_STORE" s  ON s.STORE_ID = i.STORE_ID
      JOIN "${MF}"."MARA"    p  ON p.MATNR     = i.MATNR
      JOIN "${MF}"."MAKT"    k  ON k.MATNR     = i.MATNR AND k.SPRAS = 'E' AND k.MANDT = '100'
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID = i.STORE_ID AND f.MATNR = i.MATNR
            AND f.COLOR = i.COLOR AND f.SIZE_VAL = i.SIZE_VAL
            AND f.SCENARIO = i.SCENARIO
      WHERE i.STOCK_STATUS IN ('R','Y')
        AND ${SCENE_I}
      ORDER BY i.STOCK_STATUS ASC, REVENUE_AT_RISK DESC
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/stockout-alerts', e); res.status(500).json({ error: e.message }); }
});

// card01 content — revenue at risk aggregated by status (for Analytical Card)
app.get('/cards/stockout-by-status', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT
        CASE i.STOCK_STATUS WHEN 'R' THEN 'Critical' WHEN 'Y' THEN 'Attention' ELSE 'OK' END AS status_label,
        ROUND(SUM(CASE WHEN f.QTY_FORECAST > i.QTY_ON_HAND
                       THEN (f.QTY_FORECAST - i.QTY_ON_HAND) * COALESCE(p.RETAIL_PRICE,0)
                       ELSE 0 END), 2) AS revenue_at_risk
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."MARA" p ON p.MATNR = i.MATNR
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID = i.STORE_ID AND f.MATNR = i.MATNR
            AND f.COLOR = i.COLOR AND f.SIZE_VAL = i.SIZE_VAL
            AND f.SCENARIO = i.SCENARIO
      WHERE i.STOCK_STATUS IN ('R','Y')
        AND ${SCENE_I}
      GROUP BY i.STOCK_STATUS
      ORDER BY i.STOCK_STATUS ASC
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/stockout-by-status', e); res.status(500).json({ error: e.message }); }
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
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      WHERE STOCK_STATUS IN ('R','Y')
        AND SCENARIO = CASE WHEN STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
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
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."M_STORE" s ON s.STORE_ID = n.STORE_ID
      WHERE n.SCENARIO = CASE WHEN n.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
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
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      WHERE SCENARIO = CASE WHEN STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
    `);
    res.json({ value: rows });
  } catch (e) { LOG.error('cards/nps-avg', e); res.status(500).json({ error: e.message }); }
});

// card03 — Receita em Risco por Loja (Franqueadora — bar chart)
app.get('/cards/revenue-at-risk', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    // Formula aligned with CV_FACT_INVENTORY view used by SAC:
    // REVENUE_AT_RISK = (QTY_FORECAST - QTY_ON_HAND) * RETAIL_PRICE when QTY_FORECAST > QTY_ON_HAND
    const rows = await hanaExec(conn, `
      SELECT i.STORE_ID, s.STORE_NAME,
             SUM(CASE WHEN i.STOCK_STATUS='R' THEN 1 ELSE 0 END) AS CRITICAL_SKUS,
             SUM(CASE WHEN i.STOCK_STATUS='Y' THEN 1 ELSE 0 END) AS ATTENTION_SKUS,
             ROUND(SUM(CASE WHEN f.QTY_FORECAST > i.QTY_ON_HAND
                            THEN (f.QTY_FORECAST - i.QTY_ON_HAND) * COALESCE(p.RETAIL_PRICE,0)
                            ELSE 0 END), 2) AS REVENUE_AT_RISK
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."M_STORE" s ON s.STORE_ID = i.STORE_ID
      JOIN "${MF}"."MARA"    p ON p.MATNR     = i.MATNR
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID = i.STORE_ID AND f.MATNR = i.MATNR
            AND f.COLOR = i.COLOR AND f.SIZE_VAL = i.SIZE_VAL
            AND f.SCENARIO = i.SCENARIO
      WHERE i.STOCK_STATUS IN ('R','Y')
        AND ${SCENE_I}
      GROUP BY i.STORE_ID, s.STORE_NAME
      ORDER BY REVENUE_AT_RISK DESC
    `);
    res.json({ value: rows.map(r => ({
      store_id:        r.store_id        || r.STORE_ID,
      store_name:      r.store_name      || r.STORE_NAME,
      critical_skus:   Number(r.critical_skus   || r.CRITICAL_SKUS   || 0),
      attention_skus:  Number(r.attention_skus  || r.ATTENTION_SKUS  || 0),
      revenue_at_risk: Number(r.revenue_at_risk || r.REVENUE_AT_RISK || 0)
    })) });
  } catch (e) { LOG.error('cards/revenue-at-risk', e); res.status(500).json({ error: e.message }); }
});

// card03 header — receita total em risco
app.get('/cards/revenue-at-risk-total', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT ROUND(SUM(CASE WHEN f.QTY_FORECAST > i.QTY_ON_HAND
                           THEN (f.QTY_FORECAST - i.QTY_ON_HAND) * COALESCE(p.RETAIL_PRICE,0)
                           ELSE 0 END), 2) AS total_revenue_at_risk,
             SUM(CASE WHEN i.STOCK_STATUS='R' THEN 1 ELSE 0 END) AS critical_skus
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."MARA" p ON p.MATNR = i.MATNR
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID=i.STORE_ID AND f.MATNR=i.MATNR
            AND f.COLOR=i.COLOR AND f.SIZE_VAL=i.SIZE_VAL
            AND f.SCENARIO=i.SCENARIO
      WHERE i.STOCK_STATUS IN ('R','Y')
        AND ${SCENE_I}
    `);
    const r = rows[0] || {};
    res.json({ value: [{ total_revenue_at_risk: Number(r.total_revenue_at_risk || r.TOTAL_REVENUE_AT_RISK), critical_skus: Number(r.critical_skus || r.CRITICAL_SKUS) }] });
  } catch (e) { LOG.error('cards/revenue-at-risk-total', e); res.status(500).json({ error: e.message }); }
});

// card08 — Sell-Out by Store (current month) + monthly target
app.get('/cards/sellout-by-store', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT st.STORE_ID, st.STORE_NAME,
             ROUND(SUM(it.NET_AMOUNT), 2) AS sellout,
             COALESCE(t.TARGET_AMOUNT, 0)  AS target
      FROM "${MF}"."T_SELLOUT_HDR" h
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."T_SELLOUT_ITM" it ON it.RECEIPT_ID = h.RECEIPT_ID
      JOIN "${MF}"."M_STORE" st ON st.STORE_ID = h.STORE_ID
      LEFT JOIN "${MF}"."M_SALES_TARGET" t
             ON t.STORE_ID = h.STORE_ID
            AND t.YEAR  = YEAR(CURRENT_DATE)
            AND t.MONTH = MONTH(CURRENT_DATE)
      WHERE YEAR(h.RECEIPT_DATE)  = YEAR(CURRENT_DATE)
        AND MONTH(h.RECEIPT_DATE) = MONTH(CURRENT_DATE)
        AND ${SCENE_HDR}
      GROUP BY st.STORE_ID, st.STORE_NAME, t.TARGET_AMOUNT
      ORDER BY sellout DESC
    `);
    // average target across stores → used as reference line
    const avgTarget = rows.length
      ? Math.round(rows.reduce((s, r) => s + Number(r.target || r.TARGET || 0), 0) / rows.length)
      : 0;
    res.json({
      avg_target: avgTarget,
      value: rows.map(r => ({
        store_name: r.store_name || r.STORE_NAME,
        sellout:    Number(r.sellout    || r.SELLOUT    || 0),
        target:     Number(r.target     || r.TARGET     || 0)
      }))
    });
  } catch (e) { LOG.error('cards/sellout-by-store', e); res.status(500).json({ error: e.message }); }
});

// card06 — Top Articles Category by Sell-Out (pie chart)
app.get('/cards/sellout-by-category', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT
        CASE w.ARTGR
          WHEN 'FTWR' THEN 'Footwear' WHEN 'BAGS' THEN 'Bags'
          WHEN 'WSWR' THEN 'Women''s Wear' WHEN 'MSWR' THEN 'Men''s Wear'
          WHEN 'ACCS' THEN 'Accessories' ELSE w.ARTGR END AS category,
        ROUND(SUM(it.QTY * it.UNIT_PRICE), 2) AS total_sales,
        ROUND(100.0 * SUM(it.QTY * it.UNIT_PRICE) /
              SUM(SUM(it.QTY * it.UNIT_PRICE)) OVER(), 2) AS pct
      FROM "${MF}"."T_SELLOUT_ITM" it
      JOIN "${MF}"."T_SELLOUT_HDR" h ON h.RECEIPT_ID = it.RECEIPT_ID
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."MARA" m ON m.MATNR = it.MATNR AND m.MANDT = '100'
      JOIN "${MF}"."MAW1" w ON w.MATNR = it.MATNR AND w.MANDT = m.MANDT
      WHERE ${SCENE_HDR}
      GROUP BY w.ARTGR
      ORDER BY total_sales DESC
    `);
    res.json({ value: rows.map(r => ({
      category:    r.category    || r.CATEGORY,
      total_sales: Number(r.total_sales || r.TOTAL_SALES || 0),
      pct:         Number(r.pct         || r.PCT         || 0)
    })) });
  } catch (e) { LOG.error('cards/sellout-by-category', e); res.status(500).json({ error: e.message }); }
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
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      WHERE STORE_ID = ? AND STOCK_STATUS IN ('R','Y')
        AND SCENARIO = CASE WHEN STORE_ID='BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
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
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."MARA" p ON p.MATNR = i.MATNR
      JOIN "${MF}"."MAKT" k ON k.MATNR = i.MATNR AND k.SPRAS='E' AND k.MANDT='100'
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID=i.STORE_ID AND f.MATNR=i.MATNR
            AND f.COLOR=i.COLOR AND f.SIZE_VAL=i.SIZE_VAL
            AND f.SCENARIO=i.SCENARIO
      WHERE i.STORE_ID = ? AND i.STOCK_STATUS IN ('R','Y')
        AND i.SCENARIO = CASE WHEN i.STORE_ID='BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
      ORDER BY i.STOCK_STATUS ASC, REVENUE_AT_RISK DESC
      LIMIT 6
    `, [store]);
    const h = header[0] || {};
    res.json({
      summary: { critical: Number(h.critical || h.CRITICAL || 0), attention: Number(h.attention || h.ATTENTION || 0) },
      value: items.map(r => ({
        matnr:           r.matnr        || r.MATNR,
        article_name:    r.article_name || r.ARTICLE_NAME,
        color:           r.color        || r.COLOR,
        size_val:        r.size_val     || r.SIZE_VAL,
        qty_on_hand:     Number(r.qty_on_hand     || r.QTY_ON_HAND     || 0),
        stock_status:    r.stock_status || r.STOCK_STATUS,
        status_label:    r.status_label || r.STATUS_LABEL,
        status_state:    r.status_state || r.STATUS_STATE,
        qty_forecast:    Number(r.qty_forecast    || r.QTY_FORECAST    || 0),
        days_to_stockout:Number(r.days_to_stockout|| r.DAYS_TO_STOCKOUT|| 0),
        revenue_at_risk: Number(r.revenue_at_risk || r.REVENUE_AT_RISK || 0)
      }))
    });
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

// NPS score for a specific store
app.get('/cards/my-nps', async (req, res) => {
  const store = req.query.store || 'BR-SP-001';
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT
        COUNT(*)                                                                     AS total_responses,
        SUM(CASE WHEN n.SCORE >= 9 THEN 1 ELSE 0 END)                              AS promoters,
        SUM(CASE WHEN n.SCORE BETWEEN 7 AND 8 THEN 1 ELSE 0 END)                  AS passives,
        SUM(CASE WHEN n.SCORE <= 6 THEN 1 ELSE 0 END)                              AS detractors,
        ROUND((SUM(CASE WHEN n.SCORE >= 9 THEN 1.0 ELSE 0 END) / COUNT(*) -
               SUM(CASE WHEN n.SCORE <= 6 THEN 1.0 ELSE 0 END) / COUNT(*)) * 100, 1) AS nps_score,
        CASE WHEN AVG(n.SCORE) >= 8 THEN 'Good'
             WHEN AVG(n.SCORE) >= 6 THEN 'Critical'
             ELSE 'Error' END                                                       AS nps_state
      FROM "${MF}"."T_NPS" n
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      WHERE n.STORE_ID = ?
        AND n.SCENARIO = CASE WHEN n.STORE_ID = 'BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
    `, [store]);
    const r = rows[0] || {};
    res.json({
      summary: {
        nps_score:       Number(r.nps_score       || r.NPS_SCORE       || 0),
        nps_state:        r.nps_state        || r.NPS_STATE        || 'None',
        total_responses: Number(r.total_responses || r.TOTAL_RESPONSES || 0),
        promoters:       Number(r.promoters       || r.PROMOTERS       || 0),
        passives:        Number(r.passives        || r.PASSIVES        || 0),
        detractors:      Number(r.detractors      || r.DETRACTORS      || 0)
      }
    });
  } catch (e) { LOG.error('cards/my-nps', e); res.status(500).json({ error: e.message }); }
});

// Revenue at risk for a specific store
app.get('/cards/my-revenue', async (req, res) => {
  const store = req.query.store || 'BR-SP-001';
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT
        SUM(CASE WHEN i.STOCK_STATUS='R' THEN 1 ELSE 0 END) AS critical_skus,
        SUM(CASE WHEN i.STOCK_STATUS='Y' THEN 1 ELSE 0 END) AS attention_skus,
        ROUND(SUM(CASE WHEN f.QTY_FORECAST > i.QTY_ON_HAND
                       THEN (f.QTY_FORECAST - i.QTY_ON_HAND) * COALESCE(p.RETAIL_PRICE, 0)
                       ELSE 0 END), 2) AS revenue_at_risk,
        CASE WHEN SUM(CASE WHEN i.STOCK_STATUS='R' THEN 1 ELSE 0 END) > 5 THEN 'Error'
             WHEN SUM(CASE WHEN i.STOCK_STATUS='R' THEN 1 ELSE 0 END) > 0 THEN 'Critical'
             ELSE 'Good' END AS revenue_state
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."MARA" p ON p.MATNR = i.MATNR
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID=i.STORE_ID AND f.MATNR=i.MATNR
            AND f.COLOR=i.COLOR AND f.SIZE_VAL=i.SIZE_VAL
            AND f.SCENARIO=i.SCENARIO
      WHERE i.STORE_ID = ?
        AND i.STOCK_STATUS IN ('R','Y')
        AND i.SCENARIO = CASE WHEN i.STORE_ID='BR-SP-001' THEN _D.ACTIVE_SCENARIO ELSE 'BAD' END
    `, [store]);
    const r = rows[0] || {};
    res.json({
      summary: {
        revenue_at_risk: Number(r.revenue_at_risk || r.REVENUE_AT_RISK || 0),
        critical_skus:   Number(r.critical_skus   || r.CRITICAL_SKUS   || 0),
        attention_skus:  Number(r.attention_skus  || r.ATTENTION_SKUS  || 0),
        revenue_state:    r.revenue_state   || r.REVENUE_STATE   || 'None'
      }
    });
  } catch (e) { LOG.error('cards/my-revenue', e); res.status(500).json({ error: e.message }); }
});

// Sellout vs monthly target for a specific store
app.get('/cards/my-sellout', async (req, res) => {
  const store = req.query.store || 'BR-SP-001';
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT
        ROUND(
          CASE WHEN h.STORE_ID = 'BR-SP-001' AND _D.ACTIVE_SCENARIO = 'BAD'
               THEN SUM(it.NET_AMOUNT) * 0.5
               ELSE SUM(it.NET_AMOUNT) END, 2)   AS sellout,
        COALESCE(MAX(t.TARGET_AMOUNT), 0)          AS target,
        CASE WHEN MAX(t.TARGET_AMOUNT) > 0
             THEN ROUND(
               (CASE WHEN h.STORE_ID = 'BR-SP-001' AND _D.ACTIVE_SCENARIO = 'BAD'
                     THEN SUM(it.NET_AMOUNT) * 0.5
                     ELSE SUM(it.NET_AMOUNT) END)
               / MAX(t.TARGET_AMOUNT) * 100, 1)
             ELSE 0 END                            AS pct_of_target,
        CASE WHEN MAX(t.TARGET_AMOUNT) > 0 AND
                  (CASE WHEN h.STORE_ID = 'BR-SP-001' AND _D.ACTIVE_SCENARIO = 'BAD'
                        THEN SUM(it.NET_AMOUNT) * 0.5
                        ELSE SUM(it.NET_AMOUNT) END)
                  / MAX(t.TARGET_AMOUNT) >= 0.9 THEN 'Good'
             WHEN MAX(t.TARGET_AMOUNT) > 0 AND
                  (CASE WHEN h.STORE_ID = 'BR-SP-001' AND _D.ACTIVE_SCENARIO = 'BAD'
                        THEN SUM(it.NET_AMOUNT) * 0.5
                        ELSE SUM(it.NET_AMOUNT) END)
                  / MAX(t.TARGET_AMOUNT) >= 0.7 THEN 'Critical'
             ELSE 'Error' END                      AS sellout_state
      FROM "${MF}"."T_SELLOUT_HDR" h
      CROSS JOIN "${MF}"."M_DEMO_STATE" _D
      JOIN "${MF}"."T_SELLOUT_ITM" it ON it.RECEIPT_ID = h.RECEIPT_ID
      LEFT JOIN "${MF}"."M_SALES_TARGET" t
             ON t.STORE_ID = h.STORE_ID
            AND t.YEAR  = YEAR(CURRENT_DATE)
            AND t.MONTH = MONTH(CURRENT_DATE)
      WHERE h.STORE_ID = ?
        AND YEAR(h.RECEIPT_DATE)  = YEAR(CURRENT_DATE)
        AND MONTH(h.RECEIPT_DATE) = MONTH(CURRENT_DATE)
      GROUP BY h.STORE_ID, _D.ACTIVE_SCENARIO
    `, [store]);
    const r = rows[0] || {};
    res.json({
      summary: {
        sellout:       Number(r.sellout       || r.SELLOUT       || 0),
        target:        Number(r.target        || r.TARGET        || 0),
        pct_of_target: Number(r.pct_of_target || r.PCT_OF_TARGET || 0),
        sellout_state:  r.sellout_state || r.SELLOUT_STATE || 'None'
      }
    });
  } catch (e) { LOG.error('cards/my-sellout', e); res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO ADMIN endpoints  —  /admin/*
// Write access to RUNMYFRANCHISE_MF via DBADMIN for demo scenario control.
// ═══════════════════════════════════════════════════════════════════════════════

// GET /admin/stores — list all stores for UI selects
app.get('/admin/stores', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn,
      `SELECT STORE_ID, STORE_NAME, CITY, REGION FROM "${MF}"."M_STORE" ORDER BY STORE_NAME`);
    res.json({ value: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/orders — list all orders for UI selects
app.get('/admin/orders', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const rows = await hanaExec(conn, `
      SELECT h.ORDER_ID, h.STORE_ID, s.STORE_NAME, h.STATUS,
             TO_VARCHAR(h.ORDER_DATE,'YYYY-MM-DD') AS ORDER_DATE
      FROM "${MF}"."T_SELLIN_HDR" h
      JOIN "${MF}"."M_STORE" s ON s.STORE_ID = h.STORE_ID
      ORDER BY h.ORDER_DATE DESC
    `);
    res.json({ value: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /admin/reset — restore demo baseline from JSON files (scripts/data/baseline/)
app.post('/admin/reset', async (_req, res) => {
  try {
    const conn = await getHanaConn();
    const files = fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith('.json'));
    if (!files.length) return res.status(500).json({ error: 'No baseline files found in ' + BASELINE_DIR });

    let restoredTables = 0, totalRows = 0;
    const results = [];

    for (const file of files.sort()) {
      const baseline = JSON.parse(fs.readFileSync(path.join(BASELINE_DIR, file), 'utf8'));
      const { table, columns, rows } = baseline;

      // Delete all current rows
      await new Promise((ok, ko) =>
        conn.exec(`DELETE FROM "${MF}"."${table}"`, [], e => e ? ko(e) : ok()));

      // Bulk insert from baseline
      if (rows.length) {
        const colsQ = columns.map(c => `"${c}"`).join(', ');
        const ph    = columns.map(() => '?').join(', ');
        const stmt  = conn.prepare(`INSERT INTO "${MF}"."${table}" (${colsQ}) VALUES (${ph})`);
        for (const row of rows) {
          const vals = columns.map(c => row[c] === undefined ? null : row[c]);
          await new Promise((ok, ko) => stmt.exec(vals, e => e ? ko(e) : ok()));
        }
      }

      await new Promise((ok, ko) => conn.commit(e => e ? ko(e) : ok()));
      restoredTables++;
      totalRows += rows.length;
      results.push({ table, rows: rows.length });
      LOG.info(`reset: restored ${table} (${rows.length} rows)`);
    }

    res.json({ ok: true, source: 'baseline', restoredTables, totalRows, results });
  } catch (e) { LOG.error('admin/reset', e); res.status(500).json({ error: e.message }); }
});

// POST /admin/stockout-crisis — mark store SKUs as critical/attention
app.post('/admin/stockout-crisis', async (req, res) => {
  const { store_id, intensity = 'high' } = req.body || {};
  if (!store_id) return res.status(400).json({ error: 'store_id required' });
  try {
    const conn = await getHanaConn();
    if (intensity === 'high') {
      await new Promise((ok, ko) => conn.exec(
        `UPDATE "${MF}"."T_INVENTORY_SNAPSHOT" SET STOCK_STATUS='R' WHERE STORE_ID=?`,
        [store_id], e => e ? ko(e) : ok()));
    } else {
      // Alternate R and Y by row order
      const skus = await hanaExec(conn,
        `SELECT MATNR, COLOR, SIZE_VAL FROM "${MF}"."T_INVENTORY_SNAPSHOT" WHERE STORE_ID=? ORDER BY MATNR, COLOR, SIZE_VAL`,
        [store_id]);
      for (let i = 0; i < skus.length; i++) {
        const status = i % 2 === 0 ? 'R' : 'Y';
        await new Promise((ok, ko) => conn.exec(
          `UPDATE "${MF}"."T_INVENTORY_SNAPSHOT" SET STOCK_STATUS=?
           WHERE STORE_ID=? AND MATNR=? AND COLOR=? AND SIZE_VAL=?`,
          [status, store_id, skus[i].matnr, skus[i].color, skus[i].size_val],
          e => e ? ko(e) : ok()));
      }
    }
    await new Promise((ok, ko) => conn.commit(e => e ? ko(e) : ok()));
    res.json({ ok: true, store_id, intensity });
  } catch (e) { LOG.error('admin/stockout-crisis', e); res.status(500).json({ error: e.message }); }
});

// POST /admin/nps-crisis — lower NPS scores for a store
app.post('/admin/nps-crisis', async (req, res) => {
  const { store_id, new_score = 3 } = req.body || {};
  if (!store_id) return res.status(400).json({ error: 'store_id required' });
  try {
    const conn = await getHanaConn();
    // Find last 5 responses for this store
    const responses = await hanaExec(conn,
      `SELECT NPS_ID FROM "${MF}"."T_NPS" WHERE STORE_ID=? ORDER BY SURVEY_DATE DESC LIMIT 5`,
      [store_id]);
    for (const r of responses) {
      await new Promise((ok, ko) => conn.exec(
        `UPDATE "${MF}"."T_NPS" SET SCORE=? WHERE NPS_ID=?`,
        [new_score, r.nps_id], e => e ? ko(e) : ok()));
    }
    await new Promise((ok, ko) => conn.commit(e => e ? ko(e) : ok()));
    res.json({ ok: true, store_id, new_score, updated: responses.length });
  } catch (e) { LOG.error('admin/nps-crisis', e); res.status(500).json({ error: e.message }); }
});

// POST /admin/create-order — insert a new PENDING replenishment order
app.post('/admin/create-order', async (req, res) => {
  const { store_id } = req.body || {};
  if (!store_id) return res.status(400).json({ error: 'store_id required' });
  try {
    const conn = await getHanaConn();
    // Generate order ID: SI-YYYY-NNN
    const year = new Date().getFullYear();
    const countRows = await hanaExec(conn,
      `SELECT COUNT(*) AS CNT FROM "${MF}"."T_SELLIN_HDR" WHERE ORDER_ID LIKE 'SI-${year}-%'`);
    const seq = String((Number(countRows[0].cnt) + 1)).padStart(3, '0');
    const orderId = `SI-${year}-${seq}`;
    const today = new Date().toISOString().slice(0, 10);
    const delivery = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    // Get top 3 critical SKUs for store
    const skus = await hanaExec(conn, `
      SELECT i.MATNR, k.MAKTX AS ARTICLE_NAME, i.COLOR, i.SIZE_VAL,
             COALESCE(f.QTY_FORECAST, 10) AS QTY_SUGGESTED,
             COALESCE(p.RETAIL_PRICE, 0) AS UNIT_PRICE
      FROM "${MF}"."T_INVENTORY_SNAPSHOT" i
      JOIN "${MF}"."MARA" p ON p.MATNR = i.MATNR AND p.MANDT='100'
      JOIN "${MF}"."MAKT" k ON k.MATNR = i.MATNR AND k.MANDT='100' AND k.SPRAS='E'
      LEFT JOIN "${MF}"."T_DEMAND_FORECAST" f
             ON f.STORE_ID=i.STORE_ID AND f.MATNR=i.MATNR AND f.COLOR=i.COLOR AND f.SIZE_VAL=i.SIZE_VAL
      WHERE i.STORE_ID=? AND i.STOCK_STATUS IN ('R','Y')
      ORDER BY i.STOCK_STATUS ASC, f.QTY_FORECAST DESC NULLS LAST
      LIMIT 3`, [store_id]);
    if (!skus.length) return res.status(400).json({ error: 'No critical SKUs found for this store' });
    const totalAmount = skus.reduce((s, r) => s + Number(r.qty_suggested) * Number(r.unit_price), 0);
    // Insert header
    await new Promise((ok, ko) => conn.exec(
      `INSERT INTO "${MF}"."T_SELLIN_HDR" (ORDER_ID, STORE_ID, ORDER_DATE, STATUS, TOTAL_AMOUNT, CURRENCY, EXPECTED_DELIVERY)
       VALUES (?,?,?,?,?,?,?)`,
      [orderId, store_id, today, 'PENDING', totalAmount.toFixed(2), 'BRL', delivery],
      e => e ? ko(e) : ok()));
    // Insert items
    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      const lineTotal = Number(sku.qty_suggested) * Number(sku.unit_price);
      await new Promise((ok, ko) => conn.exec(
        `INSERT INTO "${MF}"."T_SELLIN_ITM" (ORDER_ID, ITEM_NUM, MATNR, COLOR, SIZE_VAL, QTY_ORDERED, QTY_DELIVERED, UNIT_PRICE, CURRENCY)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [orderId, i + 1, sku.matnr, sku.color, sku.size_val, sku.qty_suggested, 0, sku.unit_price, 'BRL'],
        e => e ? ko(e) : ok()));
    }
    await new Promise((ok, ko) => conn.commit(e => e ? ko(e) : ok()));
    res.json({ ok: true, order_id: orderId, store_id, items: skus.length, total_amount: totalAmount.toFixed(2) });
  } catch (e) { LOG.error('admin/create-order', e); res.status(500).json({ error: e.message }); }
});

// POST /admin/update-order — advance order status
app.post('/admin/update-order', async (req, res) => {
  const { order_id, status } = req.body || {};
  if (!order_id || !status) return res.status(400).json({ error: 'order_id and status required' });
  const allowed = ['PENDING', 'APPROVED', 'DELIVERED', 'CANCELLED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
  try {
    const conn = await getHanaConn();
    await new Promise((ok, ko) => conn.exec(
      `UPDATE "${MF}"."T_SELLIN_HDR" SET STATUS=? WHERE ORDER_ID=?`,
      [status, order_id], e => e ? ko(e) : ok()));
    await new Promise((ok, ko) => conn.commit(e => e ? ko(e) : ok()));
    res.json({ ok: true, order_id, status });
  } catch (e) { LOG.error('admin/update-order', e); res.status(500).json({ error: e.message }); }
});

// POST /admin/switch-scenario — toggle BAD ↔ GOOD demo state
app.post('/admin/switch-scenario', async (req, res) => {
  const { scenario } = req.body || {};
  const target = (scenario || '').toUpperCase();
  if (!['BAD', 'GOOD'].includes(target))
    return res.status(400).json({ error: 'scenario must be BAD or GOOD' });

  const BAD_VERBATIMS = [
    'Fui buscar o Chinelo Tucano e não tinha em nenhum número. Muito frustrante!',
    'Terceira vez que venho e o produto que quero está sem estoque. Vou comprar na concorrência.',
    'Loja bonita mas prateleiras vazias. Prometeram reposição há duas semanas e nada.',
    'Produto favorito da minha filha sem estoque. Ela ficou arrasada.',
    'App mostra disponível, mas na loja física não tem. Publicidade enganosa.',
    'Gerente disse que "não depende dela". Falta de comprometimento total.',
    'Sandália Mango esgotada no meu número há mais de um mês. Inadmissível.',
    'Vim especialmente para comprar o lançamento e estava sem estoque. Decepcionante.',
    'Nunca mais volto. Três visitas seguidas sem o produto que quero.',
    'Falta de planejamento de estoque é absurda para uma loja tão movimentada.'
  ];

  try {
    const conn = await getHanaConn();
    const exec = (sql, params) => new Promise((ok, ko) =>
      conn.exec(sql, params || [], (e, r) => e ? ko(e) : ok(r)));

    for (const schema of [MF, JG]) {
      await exec(`UPDATE "${schema}"."M_DEMO_STATE" SET ACTIVE_SCENARIO = ?`, [target]);
    }

    if (target === 'BAD') {
      // Populate NPS verbatim for detractors
      const rows = await exec(
        `SELECT TOP 10 NPS_ID FROM "${MF}"."T_NPS" WHERE SCENARIO = 'BAD' AND SCORE < 7 ORDER BY NPS_ID`);
      const list = Array.isArray(rows) ? rows : [];
      for (let i = 0; i < list.length && i < BAD_VERBATIMS.length; i++) {
        await exec(`UPDATE "${MF}"."T_NPS" SET VERBATIM = ? WHERE NPS_ID = ?`,
          [BAD_VERBATIMS[i], list[i].NPS_ID]);
      }
      // Ensure BAD scenario inventory rows have correct STOCK_STATUS so CAP view reflects the crisis
      await exec(`UPDATE "${MF}"."T_INVENTORY_SNAPSHOT" SET STOCK_STATUS = 'R' WHERE SCENARIO = 'BAD' AND QTY_ON_HAND <= 3`);
      await exec(`UPDATE "${MF}"."T_INVENTORY_SNAPSHOT" SET STOCK_STATUS = 'Y' WHERE SCENARIO = 'BAD' AND QTY_ON_HAND > 3 AND QTY_ON_HAND <= 8 AND STOCK_STATUS = 'G'`);
    } else {
      // Reset NPS verbatim
      await exec(`UPDATE "${MF}"."T_NPS" SET VERBATIM = NULL WHERE SCENARIO = 'BAD'`);
      // Reset BAD scenario inventory to G so the CAP view shows no alerts in GOOD state
      await exec(`UPDATE "${MF}"."T_INVENTORY_SNAPSHOT" SET STOCK_STATUS = 'G' WHERE SCENARIO = 'BAD' AND STOCK_STATUS IN ('R', 'Y')`);
    }

    await new Promise((ok, ko) => conn.commit(e => e ? ko(e) : ok()));

    // Recalculate AVG_NPS for all stores based on new active scenario
    await exec(`UPDATE "${MF}"."M_STORE" s
      SET AVG_NPS = (
        SELECT ROUND(
          (SUM(CASE WHEN n.SCORE >= 9 THEN 1.0 ELSE 0 END) / COUNT(*) -
           SUM(CASE WHEN n.SCORE <= 6 THEN 1.0 ELSE 0 END) / COUNT(*)) * 100, 1)
        FROM "${MF}"."T_NPS" n
        WHERE n.STORE_ID = s.STORE_ID AND n.SCENARIO = '${target}'
      )`);
    await new Promise((ok, ko) => conn.commit(e => e ? ko(e) : ok()));

    res.json({ ok: true, scenario: target });
  } catch (e) { LOG.error('admin/switch-scenario', e); res.status(500).json({ error: e.message }); }
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
