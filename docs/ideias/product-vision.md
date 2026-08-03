[← README](../../README.en.md)

[🇧🇷 Português](visao-produto.md) · **🇬🇧 English**

# RunMyFranchise — Post-Demo Product Vision

**Status:** Approved concept — ideas documentation for future execution  
**Context:** After the Dragons' Den 2026 presentation (26/08), the project will be reused as a pre-sales asset  
**Author:** Marcelo Fiorito  
**Date:** August 2026

---

## 1. Context and Motivation

RunMyFranchise was built for Dragons' Den 2026. The demo runs 15 minutes, is live, and focuses on a specific script featuring the Porto Alegre store (147) and the Havaianas stock-out in the Northeast.

After the event, the project has the potential to become a **reusable pre-sales asset** — capable of demonstrating the value proposition to different buyer profiles (CIO, COO, IT analyst, business manager) with the same narrative but from different perspectives.

The problem with traditional demos:
- They depend on the presenter being available
- They are fragile (network, environment, data)
- They show only one perspective at a time
- They don't scale to multiple clients simultaneously

The vision here is to build something different: a **mini franchise world** that runs autonomously, in an accelerated and controlled manner, with multiple perspective windows open simultaneously — and that can be recorded as video for asynchronous use.

---

## 2. The Concept: Demo Orchestrator

A **simulation engine** that runs the complete business cycle of a franchise network in an accelerated, deterministic, and repeatable way.

### The simulated cycle (in order):

```
① Sales happen at stores
   → inventory turnover increases
   → balance drops below the critical threshold

   ↳ ①.1  SAP RPT analyzes the historical pattern (predictive)
      → reads: average turnover × seasonal factor × month × region × 2024-2026 history
      → predicts: "Recife/SKU-100 store will hit STOCK-OUT in ~7 days"
      → predicts: "optimal replenishment quantity = 390 units (confidence: 87%)"
      → acts BEFORE the balance reaches zero
      ─────────────────────────────────────────────────────────────────
      PoC validated: sap-rpt-1.5-large learns from 94 lines of history,
      zero training. App in production: myfranchise-rpt.cfapps.us10.hana.ondemand.com
      Next step: integrate RPT into reposicao-agent.js as a pre-step
      before gpt-4o generates the justification — replaces the heuristic formula
      ─────────────────────────────────────────────────────────────────

② Replenishment Agent detects/receives the alert
   → (without RPT) calculates coverage with regional seasonality — reactive
   → (with RPT) receives pre-calculated quantity with confidence — predictive
   → generates PENDING orders with gpt-4o justification

③ Manager approves the orders
   → via Joule (natural language) or Fiori app
   → orders change to APPROVED

④ Order goes to the supplier
   → iFlow in Integration Suite fires event via AEM
   → S/4HANA creates Purchase Order
   → orders change to SENT

⑤ Delivery arrives at the store
   → Goods Receipt in S/4HANA
   → inventory balance replenished
   → orders change to RECEIVED
   → item status changes from STOCK-OUT back to OK

⑥ Store health score recovers
   → compliance + performance + inventory recalculated (4 components)
   → SAC dashboards update
   → franchisee portal reflects the improvement
```

### What changes with RPT:

| | Without RPT (today) | With RPT (next phase) |
|---|---|---|
| When the order is created | Stock-out has already occurred | ~7 days before the stock-out |
| Suggested quantity | Heuristic (turnover × lead × factor) | Predicted by the model (confidence %) |
| Decision basis | Deterministic rule | Learned historical pattern |
| Real stockout risk | High (reacts after the fact) | Low (anticipates) |
| Narrative for the jury | "System detected stock-out" | "System predicted stock-out — store never hit zero" |

### Engine controls:

| Button | Action |
|---|---|
| **▶ Run Full Cycle** | Executes the 6 steps above in sequence, with configurable delay between them |
| **⏸ Pause** | Stops the engine at the current step so the presenter can explain |
| **⏩ Fast-forward** | Reduces the delay between steps (fast-forward mode for recording) |
| **🔄 Reset** | Returns all data to the initial state (already implemented in the Admin app) |
| **▶ Run Step** | Executes only the next step in the cycle |

---

## 3. The Simultaneous Perspectives

The core idea is to show **the same events** through different "windows", each relevant to a different buyer profile.

### 3.1 Network Manager Perspective (already exists)
**System:** SAP Build Work Zone + 8 Fiori apps  
**What changes in real time:**
- "Inventory & Replenishment" tile — stock-out item counter decreases
- "Replenishment Orders" tile — pending order counter changes
- Inventory & Replenishment app — item status changes from STOCK-OUT → OK
- Replenishment Orders app — status progresses PENDING → APPROVED → RECEIVED
- Network Panel — Porto Alegre store (147) score rises as deviations are resolved

**Buyer profile:** COO, Operations Director, Franchise Manager

---

### 3.2 Joule Perspective (already exists)
**System:** SAP Joule in Work Zone  
**What changes in real time:**
- The manager asks Joule about the network state at each cycle step
- Joule responds with data from that moment: "6 pending orders" → "0 pending orders"
- Joule approves orders via natural language during the cycle

**Buyer profile:** any executive who uses a conversational assistant

---

### 3.3 Franchisee Perspective (partially exists)
**System:** Franchisee Portal (OVP — 5 cards)  
**What changes in real time:**
- "My Inventory" card — stock-out item disappears from the list
- "Health Score" card — store score rises from 32 to something higher
- "AI Recommendations" card — recommendations generated for the store appear
- "Pending Actions" card — compliance deviations are resolved

**Buyer profile:** franchisee, store manager, regional director

---

### 3.4 Analytics Analyst Perspective (to build)
**System:** SAP Analytics Cloud (SAC)  
**What changes in real time:**
- "Network Health" story — criticality donut updates (fewer stores in red)
- "Inventory by Region" story — NE bars rise as replenishment arrives
- "Financial Performance" story — projected revenue improves after stock replenishment
- KPI tiles in SAC — counters change as the cycle progresses

**Technical dependency:**
- Live Connection HANA Cloud (BTP) → SAC — no replication, directly on HANA
- Does not require integrated S/4HANA for this perspective
- Analytical models to be created in SAC on top of the HANA Cloud entities

**Buyer profile:** CFO, CDO, Head of Analytics, BI team

---

### 3.5 Database Analyst Perspective (to build)
**System:** SAP HANA Database Explorer (BTP) or SAP DBeaver  
**What changes in real time:**
- `MYFRANCHISE_ESTOQUE_UNIDADE` tables — `STATUS_CODE` column changes from STOCK-OUT → OK
- `MYFRANCHISE_PEDIDOS_REPOSICAO` table — `STATUS_CODE` column progresses through the full flow
- `MYFRANCHISE_SAUDE_UNIDADE` table — Porto Alegre store (147) `SCORESAUDE` rises
- Live queries prove the data is real — no magic, it's pure SQL

**Technical dependency:**
- HANA Explorer already available in BTP — zero additional configuration
- Demo queries to be prepared in advance

**Buyer profile:** CTO, solutions architect, DBA, skeptical technical team

---

### 3.6 Integrator Perspective (to build)
**System:** SAP Integration Suite — iFlow Monitor + SAP Advanced Event Mesh  
**What changes in real time:**
- **AEM Event Monitor** — every event published by S/4HANA or BTP appears in the broker: `MaterialDocument.Created`, `Pedido.Aprovado`, `Desvio.Detectado`
- **Integration Suite Message Monitor** — every executed iFlow appears with status (Success/Error), payload, and processing time
- **AEM Topic Hierarchy** — visualization of active topics and in-flight messages between S/4HANA, BTP, SAC, and SBPA
- Real-time proof that the approval in Joule fired a real event that crossed the broker and reached S/4HANA

**Technical dependency:**
- SAP Advanced Event Mesh provisioned in BTP
- Formation BTP + S/4HANA + AEM configured
- iFlows created in Integration Suite for the main events
- This is the highest-effort perspective alongside SBPA

**Buyer profile:** integration architect, SAP BTP consultant, IT team

---

### 3.7 Automated Process Perspective — SBPA (to build)
**System:** SAP Build Process Automation — Process Monitor  
**What changes in real time:**
- When an order is approved via Joule, an SBPA process instance is instantly created
- The Process Monitor shows the running instance: open tasks, owner, deadline
- Each flow step (send PO, wait for supplier, confirm delivery) appears with status
- When the Goods Receipt arrives in S/4HANA, the process automatically advances to "Completed"
- Compliance deviations trigger a second process: franchisee notification → deadline → escalation

**Technical dependency:**
- SBPA provisioned in BTP (already available in most tenants)
- Processes to create in SBPA for: Post-Approval Replenishment Order and Compliance Deviation
- AEM → SBPA integration via event trigger
- Medium effort — SBPA has low-code tooling

**Buyer profile:** COO, Head of Operations, process consultant, digital transformation team

---

## 4. Technical Dependencies by Perspective

| Perspective | Prerequisite | Effort | Priority |
|---|---|---|---|
| Network Manager | ✅ Already exists | — | — |
| Joule | ✅ Already exists | — | — |
| Franchisee | ✅ Already exists | — | — |
| DB Analyst | HANA Explorer — already available | Low | High |
| Analytics Analyst (SAC) | Live Connection HANA → SAC | Medium | High |
| Integrator (IS + AEM) | Formation BTP+S/4+IS+AEM + iFlows | High | Medium (phase 3) |
| Automated Processes (SBPA) | SBPA + configured processes + AEM trigger | Medium-High | Medium (phase 3) |

---

## 5. Phase Roadmap

### Phase 1 — Consolidate what exists (post Dragons' Den)
- Refine the simulation engine in the Admin app (the "Run Full Cycle" button)
- Add configurable delay between steps
- Prepare SQL queries for the DB analyst perspective
- Record videos of the 3 perspectives that already exist (Manager, Joule, Franchisee)

### Phase 1.1 — Integrate SAP RPT into the Replenishment Agent
- **PoC already validated** (`myfranchise-rpt.cfapps.us10.hana.ondemand.com`): RPT predicts stock-out and quantity from 94 lines of history, zero training
- Integrate the `sap-rpt-1.5-large` call inside `reposicao-agent.js`
- RPT replaces the heuristic quantity formula (`giro × lead × fator`)
- Expected result: orders created 7 days before stock-out, with optimized quantity and confidence score
- Estimated effort: 1-2 days (RPT API already known, deployment already exists)

### Phase 2 — SAC as the analytics perspective
- Create Live Connection HANA Cloud BTP → SAC
- Build analytical models in SAC on top of the HANA entities
- Create 2-3 stories: Network Health, Inventory by Region, Financial Performance
- Record SAC perspective video synchronized with the simulation engine

### Phase 3 — S/4HANA Integration
- Configure formation BTP + S/4HANA Public Cloud + Integration Suite
- Perform minimal data seed in S/4HANA (10 BPs, 5 Plants, 20 materials)
- Create iFlows for the 3 main events (Goods Movement, PO creation, Sales ingest)
- Record the integrator perspective video

### Phase 4 — Complete Demo Orchestrator
- Simulation engine fires real transactions in S/4HANA (GI, GR, Sales Orders)
- All 6 perspectives open simultaneously on different screens
- Split-screen recording (6 windows)
- Final edited video for asynchronous use with clients

---

## 6. Video as a Pre-Sales Product

Each perspective generates an independent video:

| Video | Target duration | Audience |
|---|---|---|
| "The Network Manager View" | 3 min | COO, Operations Director |
| "The AI Copilot View" (Joule) | 2 min | Executives, any profile |
| "The Franchisee View" | 2 min | Franchisee, store manager |
| "The Analytics View" (SAC) | 3 min | CFO, Head of BI |
| "The Database View" | 2 min | CTO, architect |
| "The Integration View" (IS + AEM) | 3 min | SAP architect, IT team |
| "The Process Automation View" (SBPA) | 3 min | COO, Head of Operations, process consultant |
| **"The Full Picture"** (split screen) | **5 min** | **Everyone — anchor video** |

The "The Full Picture" video shows all perspectives simultaneously — it is the video that goes on the website, LinkedIn, and prospecting emails. The individual videos go into specific technical conversations.

---

## 7. The Simulation Engine — Implementation

The engine would be an extension of the current Admin app. The sequence of steps would be implemented as a CAP action `rodarCicloCompleto(delay_segundos)` that:

1. **[RPT]** Calls `sap-rpt-1.5-large` with history + current data → receives risk and quantity predictions
2. Reduces `saldoAtual` of selected items below `estoqueMinimo` → STOCK-OUT status
3. Calls `gerarReposicaoTodas()` → Agent uses RPT quantity (or heuristic as fallback) → PENDING orders
4. Waits `delay` seconds (for the presenter to point out the perspective)
5. Calls `aprovarTodosPendentes()` → orders → APPROVED → AEM event published
6. Waits `delay` seconds
7. Simulates sending to supplier → IS iFlow receives event → orders → SENT
8. Waits `delay` seconds
9. Calls `simularRecebimento()` → orders → RECEIVED, inventory replenished → AEM event published
10. Recalculates health scores (4 components: performance + compliance + contract + inventory)

The configurable `delay` allows running in "live presentation" mode (30s between steps) or "accelerated recording" mode (3s between steps).

---

## 8. Open Questions

- **Shared S/4HANA:** how to isolate franchise data from other tenant data? Use a specific client or prefix BPs/Plants?
- **SAC:** does the current SAC tenant have a license for Live Connection with an external HANA Cloud BTP?
- **Recording:** recording tool (Camtasia, OBS, SAP Enable Now?) — which is available?
- **Split screen:** would the multi-perspective recording be done live (multiple screens) or edited in post-production?
- **S/4HANA data:** can the franchise data (BPs, materials, Plants) be created in the shared tenant without impacting other users?

---

## 9. Suggested Next Steps

1. **Now:** save this document and share with the team
2. **Post Dragons' Den:** evaluate the demo result and decide investment in Phase 2
3. **Phase 2:** start with the Live Connection HANA → SAC — lowest effort, highest visual impact
4. **In parallel:** prepare the SQL queries for the DB analyst perspective (zero cost)
5. **Before Phase 3:** align with the S/4HANA team on data isolation in the shared tenant


---

[← README](../../README.en.md)
