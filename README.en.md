# RunMyFranchise

[🇧🇷 Português](README.md) · **🇬🇧 English**

> **SAP BTP solution for franchise network management**
> Dragons' Den: Learn to Win Edition 2026 — SAP Solution Advisory

---

## Overview

**Problem:** Franchisors struggle to manage and expand networks in a standardized way. Information is scattered, compliance is manual, KPIs arrive with delays, and franchisees operate as islands — with no visibility into their own performance and no proactive guidance.

**Solution:** An SAP BTP platform that connects franchisors and franchisees in real time: network panel, automatic compliance, AI agents for recommendations and inventory replenishment, an autonomous event broker (AEM), and a franchisee portal with its own dashboard.

**Anchor persona:** Alexandre Mendes — Operations Director, network of 280 fashion/lifestyle stores, wants to double the network without multiplying the chaos.

---

## Focus Scenario — Inventory Stockout

Inventory stockout is one of the key operational risks in franchise networks: out-of-stock products cause lost sales, franchisee dissatisfaction, and brand damage. The differentiator lies in **anticipating** the stockout by factoring in regional seasonality — the same replenishment strategy does not work for all regions.

**Demo with real data (July — reference month):**

| Store | Region | SKU | Coverage (Jul) | Status |
|---|---|---|---|---|
| Recife (u178) | NE | Havaianas Top | 2.6 days | 🔴 STOCKOUT |
| Salvador (u156) | NE | Havaianas Top | 1.8 days | 🔴 STOCKOUT |
| Porto Alegre (u147) | S | Havaianas Top | 66.7 days | 🟢 OK |
| Porto Alegre (u147) | S | Bota Couro Inverno | 1.8 days | 🔴 STOCKOUT |

Same product, same month → opposite risk by region. The agent calculates coverage with the regional seasonal factor and generates replenishment orders with gpt-4o justification, also considering the promotional calendar.

> **Demo scenario:** the inventory stockout case is the main focus of the August 26 demonstration. Other scenarios (compliance, onboarding, AI recommendations) may be included based on team analysis.

### Demo Flow

![Demo Flow — BPMN](docs/imagens/bpmn_en.png)

### Data validated in production — Porto Alegre Store (u147)

| Data | Value |
|---|---|
| Health Score | **32 / 100** — critical (red) |
| Compliance | 45% |
| Revenue Jun/2026 | R$ 162,378 (decline from R$ 199k in Feb → R$ 162k in Jun) |
| Detected deviations | 4 (Casual Sneaker −14.3% ALTA, Cap −24.1% ALTA, Dress −8.8% MÉDIA, unauthorized Short) |
| AI Recommendations | 3 — via gpt-4o (`mode: "GenAI Hub"` confirmed) |
| Network donut | 4 critical / 9 warning / 7 healthy (20 units) |

**Detailed script:** see `teste/DEMO_SCRIPT.en.md` (4 acts: Overview → Root Cause → AI → Endpoint)

---

## Competition Context

| Item | Detail |
|---|---|
| Event | Dragons' Den: Learn to Win Edition 2026 |
| Organization | SAP Solution Advisory |
| Format | 15-min live demo + 5-min Q&A |
| Date | August 26, 2026 |
| Critical requirement | Live demo, no screenshots |
| Highest-weight criterion | Live Demo Quality (20%) |

---

## Project Status

**Deployed to production** — SAP BTP Cloud Foundry, org `sa-build-platform-org / DEV`, region `us10`.

| Component | Status |
|---|---|
| CAP Backend + HANA Cloud + XSUAA | ✅ Production |
| AI Core + GenAI Hub (gpt-4o) | ✅ Production |
| Network Panel (LR + donut + OP) | ✅ Production |
| Governance & Compliance (LR + OP) | ✅ Production |
| Onboarding (LR + OP + Draft) | ✅ Production |
| Franchisee Portal (OVP — 5 cards) | ✅ Production |
| AI Recommendations (LR + OP) | ✅ Production |
| Inventory & Replenishment (LR + OP + Orders tab) | ✅ Production |
| Replenishment Orders (LR + OP + Approve/Reject) | ✅ Production |
| Joule (MCP Server — 9 tools) | ✅ Production — approve/reject/trigger via natural language |
| Dynamic KPI tiles (stockout + pending) | ✅ Production |
| Admin app (4-step demo flow) | ✅ Production — Reset → Simulate Sales → Approve → Receive |
| **SAP Advanced Event Mesh (AEM)** | ✅ Production — pub/sub broker, autonomous event loop |
| **Autonomous Replenishment Loop** | ✅ Production — startup scan + event-driven agent |
| **SAP RPT Predictive App** | ✅ Production — `myfranchise-rpt.cfapps.us10.hana.ondemand.com` |
| Level-3 agent (auto-approval via BPA) | ⬜ Post-demo — future: SAP BPA + IS iFlow as AEM consumer |

**Backend:** `https://sa-build-platform-org-dev-myfranchise-srv.cfapps.us10.hana.ondemand.com`

---

## SAP BTP Architecture

![RunMyFranchise Architecture](docs/imagens/arquitetura_solucao_franquias_v2_en.png)

---

## Modules (8 Fiori apps + Joule)

### 1. Network Panel
- **Floorplan:** List Report + Object Page
- **contextPath:** `/Saude_Dashboard` → drill-down `/Unidades`
- **Highlight:** Criticality donut (`@Aggregation.ApplySupported`): Critical / Warning / Healthy. Table with color-coded score. Filter by cluster/region.

### 2. Governance & Compliance
- **Floorplan:** List Report + Object Page
- **contextPath:** `/Desvios`
- **Highlight:** Automatic deviation detection in `after CREATE VendaPraticada`. Color-coded severity (ALTA red, MÉDIA yellow).

### 3. Onboarding
- **Floorplan:** List Report + Object Page + `@odata.draft.enabled`
- **contextPath:** `/ProcessosOnboarding`
- **Highlight:** End-to-end tracking of new store openings. Draft saves progress automatically.

### 4. Inventory & Replenishment
- **Floorplan:** List Report + Object Page
- **contextPath:** `/Estoque_Unidade`
- **Highlight:** Coverage calculated with regional seasonality. Object Page with **Replenishment Orders** tab — clicking a stockout item shows the agent-generated orders for that SKU/store. Dynamic KPI tile: stockout count (30s refresh).

### 5. Replenishment Orders
- **Floorplan:** List Report + Object Page
- **contextPath:** `/Pedidos_Reposicao`
- **Highlight:** Dedicated app for managers to approve/reject orders generated by the Replenishment Agent. Filters by status, region, and origin (AI Agent / Manual). **Approve** and **Reject** buttons with parameter dialog. Dynamic KPI tile: pending order count (30s refresh).

### 6. AI Recommendations
- **Floorplan:** List Report + Object Page
- **contextPath:** `/MinhasRecomendacoes`
- **Highlight:** Recommendations generated by gpt-4o with full description, color-coded priority.

### 7. Franchisee Portal
- **Floorplan:** Overview Page (OVP) — 5 cards
- **Highlight:** Revenue, Score, Deviations, AI Recommendations, Cluster Benchmark. Each card scoped to the franchisee's own store.

### 8. Admin (demo control)
- **Floorplan:** Custom UI5 (page + buttons)
- **Service:** `FranqueadoraService` — role `Franqueadora_Gestor`
- **Highlight:** Control panel for the demo. Shows live KPIs (PENDING orders + STOCKOUT items). 4-step demo flow:
  - **Step 1 — Reset Demo**: all 13 stocks → OK (balance ~180), all orders deleted, health scores recalculated
  - **Step 2 — Simulate Sales Rush**: reduces 8 SKUs to RUPTURA/ATENCAO → emits AEM events → agent creates PENDING orders automatically (~15s)
  - **Step 3 — Approve (via Joule or app)**: approve all pending orders
  - **Step 4 — Simulate Goods Receipt**: replenishes stock → emits AEM events → handler logs resolution
  - Operation log with timestamps (last 20 actions)

### Joule (conversational copilot)
- **Python MCP Server:** `joule-myfranchise-mcp` (Python FastMCP, CF — active in Joule Studio)
  `https://joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com`
- **Node.js MCP Server:** `myfranchise-mcp` (Node.js, CF — same 9 tools, direct HANA, faster)
  `https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com`
- **9 tools:**

| Tool | Description |
|---|---|
| `get_lojas_em_risco` | Stores at stockout risk, filtered by region/category |
| `get_cobertura_estoque` | Coverage in days for a specific store/SKU |
| `get_pedidos_pendentes` | Replenishment orders awaiting approval |
| `get_recomendacoes` | AI recommendations by store and priority |
| `get_score_rede` | Health scores across the network |
| `aprovar_pedido` | Approve a single pending order by ID |
| `recusar_pedido` | Reject a single pending order by ID |
| `aprovar_pedidos` | Approve ALL pending orders (network-wide or by store) |
| `acionar_reposicao` | Trigger Replenishment Agent for one or all stores |

- **Validated flow:** end-to-end order approval via natural language
- **Example:** *"Approve all pending Havaianas orders"* → Joule lists, identifies IDs, and approves all automatically
- **Store names:** all tools accept store names (e.g. "Porto Alegre") — auto-resolve to ID
- **Auth:** OAuth2 `client_credentials` via XSUAA; CSRF token fetch before POST actions

---

## SAP Advanced Event Mesh (AEM)

The integration with **SAP Advanced Event Mesh** (Solace PubSub+) is fully working in production.

- **Plugin:** `@cap-js/advanced-event-mesh` with custom `PatchedAEM` wrapper (`srv/aem-patched.js`)
- **Patch:** Basic Auth on `createSession` (OAuth does not work on Developer 100 plan)
- **Consumer:** separate queue `myfranchise-consumer` with `solace-cloud-client` owner
- **3 active topics:**
  - `Estoque/Changed` — emitted when stock items are created/updated
  - `Pedido/StatusChanged` — emitted when orders are approved/rejected
  - `Desvio/Detectado` — emitted when a compliance deviation is detected
- **Broker:** `mr-connection-yfqw57w6xwk.messaging.solace.cloud`
- **Dev:** `file-based-messaging`; **Production:** `advanced-event-mesh`

### Autonomous Event Loop (`srv/events/messaging.js`)

- **On startup:** scans all stockout items → emits events → agent creates orders automatically
- **`messaging.on(TOPIC_ESTOQUE)`:** RUPTURA/ATENCAO → triggers Replenishment Agent without human intervention
- **`messaging.on(TOPIC_PEDIDO)`:** logs approval events
- **Future consumer:** SAP BPA + Integration Suite via iFlow

---

## AI Agents

### Recommendations Agent (`srv/ai/recommendations-job.js`)
- **LLM:** gpt-4o via `@sap-ai-sdk/orchestration` (GenAI Hub)
- **Input:** KPIs, cluster benchmark, open compliance deviations
- **Output:** 3 prioritized recommendations (ALTA/MÉDIA/BAIXA) with rich descriptions
- **Fallback:** deterministic rules (price deviation → PRECIFICACAO; revenue drop → CAMPANHA; low NPS → TREINAMENTO)
- **Actions:** `gerarRecomendacoes(unidade_ID)`, `gerarRecomendacoesTodas()`

### Replenishment Agent (`srv/ai/reposicao-agent.js`)
- **LLM:** gpt-4o via GenAI Hub (same pattern)
- **Input:** stock balance, average turnover, lead time, regional seasonal factor, promotional uplift
- **Output:** `Pedidos_Reposicao` in **PENDENTE** status — calculated quantity (turnover × lead time × seasonal factor), suggested supplier, detailed justification
- **Seasonal logic:** `coberturaDias = saldoAtual / (giroMedioDiario × fatorSazonal × upliftPromo)`. Stockout when `coberturaDias < leadTimeDias`.
- **Actions:** `gerarReposicao(unidade_ID)`, `gerarReposicaoTodas()`
- **Level:** 1-2 (detects + proposes). Level 3 (automatic approval via BPA) = next step.

---

## Health Score Formula

```
scoreSaude = (performancePct × 0.35) + (compliancePct × 0.35) + (scoreContrato × 0.15) + (estoquePct × 0.15)

performancePct = min(kpi.faturamento / benchmark.faturamentoMedio × 100, 100)
                 defaults to 50 if no KPI or benchmark is available

compliancePct  = max(0, 100 − openDeviations × 12)
                 each ABERTO or NOTIFICADO deviation costs 12 points

scoreContrato:   ATIVO            → 100
                 VENCENDOEM90DIAS →  60
                 VENCENDOEM30DIAS →  30
                 other / expired  →   0

estoquePct     = max(0, 100 − stockouts × 25 − warnings × 10)
                 reflects stockouts immediately when simularVendas is called

Criticality thresholds:
  scoreSaude < 45  → 1 CRITICAL (red)
  45 ≤ score < 70  → 2 WARNING  (yellow)
  score ≥ 70       → 3 HEALTHY  (green)
```

---

## Security Model

Data isolation between franchisees is implemented via **instance-based authorization** with XSUAA and SAP Cloud Identity Services (IAS):

- Each franchisee user receives a custom `unidade_ID` attribute in IAS/XSUAA during onboarding.
- CAP automatically applies query-time filters via `@restrict` annotations: `where: 'unidade_ID = $user.unidade_ID'`.
- No cross-franchisee query is possible without the `Franqueadora_Gestor` role.
- Default model: **single-tenant with row-level security** — suitable for hundreds of units. For SaaS multi-tenant scale, CAP supports promotion to `@multitenancy` with isolated subscriber tenants.

---

## Documentation

All project documents, organized by category. Each document contains a back-link to this README.

| Category | Document | Description |
|---|---|---|
| Business | [Product Requirements Document](docs/requisitos/PRD.en.md) | Functional requirements, personas, user stories, and acceptance criteria |
| Business | [Demo Script](teste/DEMO_SCRIPT.en.md) | 4 acts, stockout narrative, pre-demo checklist, and plan B |
| Technical | [Technical Specification](docs/especificação/SPEC.en.md) | Data model, OData services, CAP handlers, and security annotations |
| Technical | [SAP Retail Portfolio Integration](docs/integração/Integration.en.md) | Fit analysis with S/4HANA, IBP, CAR, and Ariba |
| Technical | [Joule Setup in Work Zone](docs/integração/joule.md) | Prerequisites and MCP Server configuration in Work Zone |
| Technical | [MCP Server — Joule](docs/integração/mcp-server.md) | 9 tools, server architecture, deployment, and troubleshooting |
| Ideas | [Post-Demo Product Vision](docs/ideias/visao-produto.md) | Conceptual roadmap for use as a pre-sales asset after the demo |
| Architecture | [Architecture Diagram (Draw.io)](docs/imagens/arquitetura-runmyfranchise.drawio) | Editable source for the architecture diagram (SAP-styled Draw.io) |
| Architecture | [SAP Shape Libraries](docs/sap-shape-libraries/) | SAP-branded shape libraries used in the Draw.io diagram |

---

## Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Frontend | Fiori Elements + Build Work Zone | Annotation-driven, no custom app |
| Backend | SAP CAP Node.js, OData V4 | `@sap/cds ^10` |
| Database | HANA Cloud (prod) / SQLite in-memory (dev) | `@cap-js/hana ^2.8` / `@cap-js/sqlite ^2.1.3` |
| AI | AI Core + GenAI Hub (gpt-4o) | `@sap-ai-sdk/orchestration ^2.13` |
| Messaging | SAP Advanced Event Mesh (Solace) | `@cap-js/advanced-event-mesh ^1.0.0` |
| Prediction | SAP RPT 1.5-large via AI Core | Zero-shot, no training, in-context learning |
| UI5 runtime | Fixed version `1.136.7` | Aligns build and runtime; avoids `Active` behavior in FE V4 |
| CAP profiles | `hana-cloud`/`xsuaa` as default; `[development]` enables sqlite+mocked | Prevents empty apps in CF |

---

## Tech Stack

```
@sap/cds                   ^10.0.5     # CAP backend (OData V4)
@cap-js/sqlite             ^2.1.3      # SQLite in-memory (dev)
@cap-js/hana               ^2.8.0      # HANA Cloud (prod)
@sap-ai-sdk/orchestration  ^2.13.0     # GenAI Hub — gpt-4o
@sap/xssec                 ^4.13.3     # XSUAA authorization
express                    ^4.22.2     # HTTP runtime
@cap-js/advanced-event-mesh ^1.0.0    # SAP Advanced Event Mesh (Solace PubSub+)
streamlit                  1.37.0      # RPT predictive app
sap-rpt-1.5-large                      # SAP Relational Pretrained Transformer (AI Core)

SAP HANA Cloud                         # production database
SAP Build Work Zone                    # portal and launchpad (managed approuter)
SAP AI Core + GenAI Hub               # AI agents (gpt-4o) + RPT prediction
SAP Advanced Event Mesh               # pub/sub event broker (Solace PubSub+)
SAP IAS + XSUAA                       # identity and authorization
SAPUI5 1.136.7                        # Fiori Elements runtime (pinned version)
```

**CAP profiles:** `hana-cloud`/`xsuaa` as **default**; `[development]` automatically enables sqlite+mocked with `cds watch`.

---

## Project Structure

```
MyFranchise/
├── db/
│   ├── schema.cds              # Data model (all modules)
│   └── data/                   # Seed CSVs
│       ├── myfranchise-Estoque_Unidade.csv    (13 SKUs with seasonal coverage)
│       ├── myfranchise-Pedidos_Reposicao.csv  (6 PENDING orders — gpt-4o)
│       ├── myfranchise-OrigemPedido.csv        (AGENTE / MANUAL)
│       └── ... (all entities and code lists)
├── srv/
│   ├── service.cds             # FranqueadoraService + FranqueadoService
│   ├── service.js              # Handlers: deviations, score, inventory, order approval, KPI endpoints
│   ├── franqueado-service.js   # FranqueadoService implementation
│   ├── server.js               # JWT middleware + /kpi/ruptura and /kpi/pedidos-pendentes endpoints
│   ├── mcp-server.js           # MCP Server Node.js bridge (CF)
│   ├── aem-patched.js          # PatchedAEM — Basic Auth fix for Developer 100 plan
│   ├── events/
│   │   └── messaging.js        # Autonomous event handlers (AEM topics)
│   └── ai/
│       ├── recommendations-job.js  # Recommendations Agent (gpt-4o + fallback)
│       └── reposicao-agent.js      # Replenishment Agent (gpt-4o + fallback)
├── app/
│   ├── network/          # Network Panel (LR + donut + OP)
│   ├── compliance/       # Governance & Compliance (LR + OP)
│   ├── onboarding/       # Onboarding (LR + OP + Draft)
│   ├── inventory/        # Inventory & Replenishment (LR + OP + Orders tab) — KPI tile
│   ├── replenishment/    # Replenishment Orders (LR + OP + Approve/Reject) — KPI tile
│   ├── recommendations/  # AI Recommendations (LR + OP)
│   ├── franchisee/       # Franchisee Portal (OVP — 5 cards)
│   └── admin/            # Admin — Demo Control (custom UI5)
├── joule-mcp/
│   └── mcp_server_cf.py        # Python FastMCP — 9 tools, active in Joule Studio
├── rpt-predicao/               # SAP RPT predictive app (Streamlit)
│   ├── app.py                  # Main app — 2-step RPT prediction
│   ├── dados/historico_estoque_franquias.csv  # Training data (94 rows)
│   └── requirements.txt
├── docs/
│   ├── especificação/SPEC.en.md            # Technical specification
│   ├── requisitos/PRD.en.md                # Product Requirements Document
│   ├── integração/                         # Joule setup, MCP Server, SAP integration
│   ├── ideias/visao-produto.md             # Post-demo product roadmap
│   └── imagens/
│       ├── arquitetura_solucao_franquias_v2_en.png  # Architecture diagram (EN)
│       ├── arquitetura_solucao_franquias_v2.png     # Architecture diagram (PT)
│       ├── bpmn_en.png                              # Demo flow BPMN (EN)
│       └── bpmn_pt.png                              # Demo flow BPMN (PT)
├── teste/
│   └── DEMO_SCRIPT.en.md # Demo script (4 acts, checklist, plan B)
├── manifest-rpt.yml      # CF deploy for RPT app
├── mta.yaml              # CF deployment (11 modules, 6 services)
├── xs-security.json      # XSUAA (roles, scopes, attributes)
└── README.en.md
```

---

## Running Locally

### Prerequisites
```bash
npm install -g @sap/cds-dk
```

### Start
```bash
npm install
cds watch
```
Open **http://localhost:4004**

### Test Users

| User | Password | Role | Service |
|---|---|---|---|
| `gestor` | `gestor` | Franqueadora_Gestor | `/franqueadora` |
| `roberto` | `roberto` | Franchisee (Porto Alegre / u147 / STD cluster) | `/franqueado` |

### Useful Endpoints
```bash
# Panel — all units with seasonal coverage
GET /franqueadora/Estoque_Unidade?$filter=sku eq 'SKU-100'

# Deviations for Porto Alegre Store (147)
GET /franqueadora/Desvios?$filter=unidade_ID eq 'u147'

# KPIs Jan–Jun (Porto Alegre / 147)
GET /franqueadora/KPI_Unidade?$filter=unidade_ID eq 'u147'&$orderby=periodo

# Recommendations Agent (gpt-4o)
POST /franqueadora/gerarRecomendacoes   { "unidade_ID": "u147" }

# Replenishment Agent (gpt-4o, with seasonality)
POST /franqueadora/gerarReposicao       { "unidade_ID": "u178" }

# Franchisee portal
GET /franqueado/MeusKPIs
GET /franqueado/MeuEstoque
GET /franqueado/MinhasRecomendacoes
```

---

## Deploy (Cloud Foundry)

```bash
mbt build
cf deploy mta_archives/myfranchise_1.0.0.mtar -f
```

The `mta.yaml` publishes 10 modules: `myfranchise-srv`, `db-deployer`, 6 HTML5 apps, `appcontent`, `destinationcontent`. Services: HANA (hdi-shared), XSUAA, HTML5 Repo (host + runtime), Destination, AI Core (existing `default_aicore`), Advanced Event Mesh.

**After each appcontent deploy:** remove and re-add the apps in the Work Zone Content Manager to clear the cache (the site does not reload automatically).

### Work Zone — Tiles

| App | `semanticObject` | `action` | Role | KPI tile |
|---|---|---|---|---|
| Network Panel | `NetworkPanel` | `display` | Franqueadora_Gestor | — |
| Governance & Compliance | `Compliance` | `manage` | Franqueadora_Gestor | — |
| Onboarding | `Onboarding` | `manage` | Franqueadora_Gestor | — |
| Inventory & Replenishment | `Inventory` | `manage` | Franqueadora_Gestor | `STOCKOUT` count |
| Replenishment Orders | `Replenishment` | `manage` | Franqueadora_Gestor | `PENDING` count |
| AI Recommendations | `Recommendations` | `display` | Franqueado | — |
| Franchisee Portal | `FranchiseePortal` | `display` | Franqueado | — |

---

## Production Notes

- **Franchisee JWT Attributes:** The IdP (IAS) does not send `unidade_ID`/`cluster` in the assertion. `srv/server.js` injects the defaults `u147`/`STD` via CAP middleware. For real production, map via IAS assertion attributes.
- **HANA/AI Core cold start:** Run 1 warm-up request before the demo (HANA and AI Core have a cold start of several seconds).
- **LR→OP navigation:** requires `contextPath` (not `entitySet`) + explicit `navigation` + `ResponsiveTable` in the manifest, and UI5 runtime at a **pinned version** (not `/resources/latest`). Version `1.136.7` has been validated.
- **AEM Basic Auth:** The SAP Advanced Event Mesh Developer 100 plan does not support OAuth on `createSession`. The `PatchedAEM` wrapper (`srv/aem-patched.js`) forces Basic Auth for that call.

---

## Roadmap (Post-Demo)

### Intelligence and Automation
- **SAP RPT Predictive Stockout** — proof of concept validated in production (`myfranchise-rpt`). Next step: integrate predictions directly into the Replenishment Agent to replace the heuristic quantity formula with RPT-predicted quantities. The model already predicts stockout risk AND optimal replenishment quantity from 94-line history, zero-shot.
- **BPA + Integration Suite as AEM consumers** — the event broker is ready. Next: configure SAP Build Process Automation trigger on `Pedido/StatusChanged(APROVADO)` and IS iFlow on `Estoque/Changed` for ERP write-back.
- **SAP Analytics Cloud** — executive dashboards (today: Fiori Elements)

### Integration with SAP Retail Systems
- **SAP S/4HANA Retail** — automatic replenishment orders
- **SAP Customer Activity Repository (CAR)** — real POS sales data
- **SAP Ariba** — supplier management to close the replenishment cycle
- **SAP Integrated Business Planning (IBP)** — demand forecasting with regional seasonality

### Data and Platform
- **SAP Datasphere** — data federation from multiple sources
- **IAS Assertion Attributes** — map `unidade_ID`/`cluster` via IdP (remove fallback middleware)
- **HANA Sequences** — replace unit code logic with native sequence

---

## References

- [CAP Documentation](https://cap.cloud.sap/docs/)
- [SAP Fiori Elements — Feature Showcase](https://github.com/SAP-samples/fiori-elements-feature-showcase)
- [cap-sflight (ALP/chart reference)](https://github.com/SAP-samples/cap-sflight)
- [cap-cert-petrobras (LR→OP navigation reference)](https://github.com/marcelofiorito/cap-cert-petrobras)
- [SAP Build Work Zone](https://help.sap.com/docs/build-work-zone-standard-edition)
- [SAP AI Core + GenAI Hub](https://help.sap.com/docs/sap-ai-core)
- [SAP Advanced Event Mesh](https://help.sap.com/docs/advanced-event-mesh)
- [OData Annotation Vocabulary](https://ui5.sap.com/#/topic/030faebe70b34198b17a93b4c6e7b4d7)
