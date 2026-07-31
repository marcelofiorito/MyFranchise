# RunMyFranchise

> **SAP BTP solution for franchise network management**  
> Dragons' Den: Learn to Win Edition 2026 — SAP Solution Advisory

---

## Overview

**Problem:** Franchisors face challenges in managing and expanding networks in a standardized and scalable way. Information stays decentralized, processes vary across units, and it is difficult to track strategy execution, operational compliance, and the evolution of franchisee performance.

**Solution:** Centralize franchise network management on a single SAP BTP platform, connecting franchisor and franchisees to standardize processes, strengthen governance, track KPIs, and support decision-making.

**Anchor persona:** Alexandre Mendes — Director of Operations and Expansion, a network of 280 stores, in the fashion/lifestyle segment. He wants to double the network in 3 years without multiplying operational chaos.

---

## Competition Context

| Item | Detail |
|---|---|
| Event | Dragons' Den: Learn to Win Edition 2026 |
| Organization | SAP Solution Advisory |
| Format | 15 min presentation + 5 min Q&A |
| Date | August 26, 2026 (tentative) |
| Critical requirement | Live demo, no screenshots |
| Team | BTP SA + Data & AI SA + Industry Advisor |

### Judging criteria

| Criterion | Weight |
|---|---|
| Live Demo Quality | 20% |
| Business Outcomes | 20% |
| Customer Understanding | 15% |
| Innovation | 15% |
| Storytelling | 15% |
| Team Collaboration | 10% |
| Executive Presence | 5% |

---

## Business Value

| Before | After |
|---|---|
| Fragmented visibility, D+2 in Excel | Single dashboard, real time |
| Compliance verified by on-site audit | Deviations detected automatically |
| Handcrafted onboarding, months of lead time | Standardized flow on the platform |
| Franchisee without guidance, high support volume | Own dashboard with AI recommendations |
| Expansion based on intuition | Decision based on performance data |

---

## SAP BTP Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ CANAIS DE ACESSO                                                │
│ Build Work Zone + Fiori Elements  │  Responsivo (PWA/browser)  │
├─────────────────────────────────────────────────────────────────┤
│ MÓDULOS DA PLATAFORMA                                           │
│ Painel da Rede │ Governança │ Portal Franqueado │ Onboarding   │
│ Recomendações da IA                                             │
├─────────────────────────────────────────────────────────────────┤
│ SERVIÇOS SAP BTP                                                │
│ SAP CAP │ AI Core + GenAI Hub (gpt-4o) │ Build Work Zone       │
├─────────────────────────────────────────────────────────────────┤
│ CAMADA DE DADOS                                                  │
│ SAP HANA Cloud (operacional) │ SAP Analytics Cloud (Fase 2)    │
│ SAP Datasphere (referência — fora do MVP)                       │
├─────────────────────────────────────────────────────────────────┤
│ SEGURANÇA & IDENTITY                                            │
│ SAP IAS │ Authorization & Trust (XSUAA) │ SAP IPS              │
└─────────────────────────────────────────────────────────────────┘
          ▲ Integration Suite ▲
  POS/PDV Franqueados │ ERP Franqueadora │ Sistemas Legados
```

### Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Franchisor frontend | Fiori Elements + Build Work Zone | Annotation-driven, fast delivery |
| Franchisee frontend | Fiori Elements + Build Work Zone | Same stack, no native app |
| Theming | SAP UI Theme Designer | Decoupled from visual identity (to be defined) |
| Mobile | Responsive via browser (PWA) | No offline requirement identified |
| Backend runtime | Cloud Foundry | More mature for MVP |
| Analytics MVP | HANA + Fiori | No additional license |
| Analytics Phase 2 | SAP Analytics Cloud | For executive storytelling and expansion |
| SAP Datasphere | Out of MVP | Cited in the architecture as an evolution |

---

## Modules (5 Fiori apps)

### 1. Network Panel
- **Floorplan:** List Report + Object Page, with a **donut chart** of criticality distribution
- **Entities:** `Saude_Unidade`, `Saude_Dashboard` (aggregatable view), `KPI_Unidade`, `Alertas`, `Benchmark_Cluster`
- **Highlight:** Weighted Health Score (40% performance + 40% compliance + 20% contract). The donut aggregates by criticality (`@Aggregation.ApplySupported` + `Analytics.AggregatedProperty`); the table shows the score with colored criticality (red <45). Selection Variants: "Critical", "Attention", "Highlights"
- **BTP Services:** CAP · HANA Cloud

### 2. Governance & Compliance
- **Floorplan:** List Report Object Page (LROP)
- **Entities:** `Catalogos`, `ItensCatalogo`, `VendaPraticada`, `Desvios`, `RegrasCompliance`, `NotificacoesCompliance`
- **Highlight:** Automatic deviation detection in the `after CREATE VendaPraticada`. Configurable rules without changing code. Store 147 (Porto Alegre) — demo scenario with 4 deviations
- **BTP Services:** CAP · HANA Cloud

### 3. Franchisee Portal
- **Floorplan:** Overview Page (OVP) — 5 cards (`sap.ovp.app.Component`)
- **Entities:** `MeusKPIs`, `MinhaSaude`, `BenchmarkMeuCluster`, `MeusDesvios`, `MinhasRecomendacoes`
- **Highlight:** Data isolation via `@restrict` + user attributes (`$user.unidade_ID` / `$user.cluster`). Cards with the store name in the subtitle, colored criticality (via `DataFieldForAnnotation` → `DataPoint`), **BRL** currency (`@Measures.ISOCurrency`), and formatted period ("Jun/2026"). Available V4 cards: `list` / `table` (charts would require OData V2)
- **BTP Services:** CAP · HANA Cloud · AI Core + GenAI Hub

### 4. Onboarding
- **Floorplan:** List Report Object Page + Fiori Draft
- **Entities:** `ProcessosOnboarding`, `EtapasOnboarding`, `TarefasOnboarding`, `DocumentosOnboarding`, `AprovacoesOnboarding`
- **Highlight:** `@odata.draft.enabled` saves progress automatically. Seed of processes/stages/tasks included
- **BTP Services:** CAP · HANA Cloud

### 5. AI Recommendations
- **Floorplan:** List Report + Object Page (Compliance pattern)
- **Entity:** `MinhasRecomendacoes` (via `FranqueadoService`)
- **Highlight:** Lists the franchisee's recommendations with colored priority; on click, the **Object Page shows the full description generated by gpt-4o** (SKUs, percentages, impact, action with deadline) — without truncating. Aligned with the Fiori pattern: OVP is the entry point, reading happens on the detail screen
- **BTP Services:** CAP · HANA Cloud · AI Core + GenAI Hub

---

## Tech Stack

```
@sap/cds                    ^10       # CAP backend (OData V4)
@cap-js/sqlite              ^2.1.3    # SQLite em memória (desenvolvimento)
@cap-js/hana                ^2.8.0    # SAP HANA Cloud (produção)
@sap-ai-sdk/orchestration   ^2.13.0   # GenAI Hub — gpt-4o (recomendações)
express                     ^4        # runtime HTTP
sap.fe.templates                      # Fiori Elements (List Report, Object Page)
sap.ovp                               # Overview Page (Portal do Franqueado)
SAP HANA Cloud                        # Banco de dados em produção
SAP Build Work Zone                   # Portal e launchpad (managed approuter)
SAP AI Core + GenAI Hub               # Recomendações para franqueados (gpt-4o)
SAP IAS + XSUAA                       # Identidade e autorização
```

> **CAP profiles (important):** production uses `hana-cloud` + `xsuaa` as the **default**; `[development]` enables `sqlite` + `mocked`. `cds watch` activates `[development]` automatically. (Reversing this causes empty apps in production — see deploy history.)

---

## Project Structure

```
MyFranchise/
├── db/
│   ├── schema.cds              # Modelo de dados unificado (4 módulos)
│   └── data/                   # Seed data CSV
│       ├── myfranchise-Franqueados.csv       (8 franqueados)
│       ├── myfranchise-Unidades.csv          (20 unidades + onboarding)
│       ├── myfranchise-KPI_Unidade.csv       (120 KPIs — 20×6 meses)
│       ├── myfranchise-Saude_Unidade.csv     (20 scores)
│       ├── myfranchise-Desvios.csv           (7 desvios — Loja 147)
│       ├── myfranchise-Recomendacoes.csv     (recomendações AI seed)
│       ├── myfranchise-ProcessosOnboarding.csv / -Etapas / -Tarefas
│       ├── myfranchise-Contratos_Franquia.csv (20 contratos)
│       └── ... (code lists e demais entidades)
├── srv/
│   ├── service.cds             # FranqueadoraService + FranqueadoService
│   ├── service.js              # Detecção de desvios + recálculo de score
│   ├── server.js               # Middleware: fallback de atributos do Franqueado
│   └── ai/
│       └── recommendations-job.js   # AI-first (GenAI Hub gpt-4o) + fallback por regras
├── app/
│   ├── network/                # Painel da Rede (List Report + donut)
│   ├── compliance/             # Governança & Compliance (LROP)
│   ├── franchisee/             # Portal do Franqueado (OVP — 5 cards)
│   ├── onboarding/             # Onboarding (LROP + Draft)
│   └── recommendations/        # Recomendações da IA (LR + Object Page)
├── teste/
│   └── ROTEIRO_DEMO.md              # Roteiro de demo (4 atos, checklist, plano B)
├── mta.yaml                    # Deploy Cloud Foundry (srv + db + 5 apps + Work Zone)
├── xs-security.json            # XSUAA (roles, scopes, atributos)
├── package.json
├── .cdsrc.json
└── README.md
```

---

## Demo Scenario — Store 147

The 15-minute live demo uses the **Porto Alegre Store (code 147)** as a unit in critical alert.

| Data | Value |
|---|---|
| Health Score | **32 / 100** (critical — red in the Panel table) |
| Compliance | 45% |
| High Severity Alerts | 3 |
| Revenue Jun/2026 | R$ 162.378 (-13.5% vs. STD cluster average) |
| NPS | 41.1 (cluster average: 58) |

**Automatically detected deviations:**

| SKU | Product | Authorized Price | Practiced Price | Deviation | Severity |
|---|---|---|---|---|---|
| SKU-004 | Casual Sneaker | R$ 315,00 | R$ 269,90 | -14.3% | High |
| SKU-011 | Curved Brim Cap | R$ 79,00 | R$ 60,00 | -24.1% | High |
| SKU-003 | Midi Dress | R$ 269,00 | R$ 229,90 | -8.8% | Medium |
| SKU-999 | Generic Unbranded Shorts | — | R$ 49,90 | Mix | High |

**AI recommendations generated (via gpt-4o / GenAI Hub):**
1. `[HIGH]` Fix the pricing of the Casual Sneaker and Curved Brim Cap
2. `[MEDIUM]` Mix adjustment / priority restocking
3. `[MEDIUM]` Training in price management

> The recommendations are generated in real time by **gpt-4o** running on AI Core ("GenAI Hub" mode), with a **rules-based fallback** in case AI Core is unavailable. The full text (SKUs, percentages, impact, action with deadline) is read in the **AI Recommendations** app.

**Network distribution in the Network Panel donut:**
- 🟢 Green (score ≥70): 7 units
- 🟡 Yellow (45–69): 9 units
- 🔴 Red (<45): 4 units (including Store 147)

---

## Run Locally

### Prerequisites

```bash
npm install -g @sap/cds-dk   # CDS CLI (instalar uma vez)
```

### Start

```bash
npm install
cds watch
```

Access **http://localhost:4004**

### Test users

| User | Password | Role | Service |
|---|---|---|---|
| `gestor` | `gestor` | Franqueadora_Gestor | `/franqueadora` |
| `roberto` | `roberto` | Franqueado (Store 147, cluster STD) | `/franqueado` |

### Reference endpoints

```
# Painel da Rede — todas as unidades com score
GET /franqueadora/Saude_Unidade?$orderby=scoreSaude

# Desvios da Loja 147
GET /franqueadora/Desvios?$filter=unidade_ID eq 'u147'

# KPIs jan–jun (Loja 147)
GET /franqueadora/KPI_Unidade?$filter=unidade_ID eq 'u147'&$orderby=periodo

# Visão do franqueado Roberto
GET /franqueado/MeusKPIs
GET /franqueado/MeusDesvios
GET /franqueado/MinhasRecomendacoes

# Gerar recomendações via IA (gpt-4o) para uma unidade
POST /franqueadora/gerarRecomendacoes   { "unidade_ID": "u147" }
```

---

## Project Status

**Deployed and running in production** on SAP BTP (Cloud Foundry · `sa-build-platform-org / DEV` · region `us10`).

| Module | Status |
|---|---|
| CAP Backend + HANA Cloud + XSUAA | ✅ In production |
| Network Panel (donut + table) | ✅ In production |
| Governance & Compliance | ✅ In production |
| Franchisee Portal (5 cards) | ✅ In production |
| Onboarding | ✅ In production |
| AI Recommendations (LR+OP) | ✅ In production |
| AI-first gpt-4o (GenAI Hub) | ✅ Confirmed (`modo: "GenAI Hub"`) |

**Backend:** `https://sa-build-platform-org-dev-myfranchise-srv.cfapps.us10.hana.ondemand.com` (`/health` → UP; OData protected by XSUAA).

### Timeline — Dragons' Den 2026

| Week | Period | Focus | Status |
|---|---|---|---|
| 1 | 07/29 – 08/04 | Backend + mock data | ✅ |
| 2 | 08/05 – 08/11 | Fiori annotations (LR + Object Page + LROP) | ✅ |
| 3 | 08/12 – 08/18 | OVP + GenAI Hub integration | ✅ |
| 4 | 08/19 – 08/25 | Polish + Work Zone + deploy + rehearsals | 🔄 Deploy done; rehearsals pending |
| **D** | **08/26** | **Presentation** | 🎯 |

### Pending items
- Live demo rehearsals (see `teste/ROTEIRO_DEMO.md`)
- Add the **AI Recommendations** app to the Work Zone site (new app)
- Build the **Stock-out + Joule + Restocking Agent** case (see dedicated section below)

---

## Deploy (Cloud Foundry)

```bash
mbt build                                          # gera mta_archives/myfranchise_1.0.0.mtar
cf deploy mta_archives/myfranchise_1.0.0.mtar -f   # publica srv + db + 5 apps + Work Zone
```

The `mta.yaml` publishes: `myfranchise-srv` (CAP), `db-deployer` (HANA HDI), the 5 HTML5 apps in the html5-repo, destinations, and Work Zone content. AI Core via `existing-service` (`default_aicore`).

## Work Zone — Manual Deploy (Week 4)

The `manifest.json` of each app already contains the necessary configuration:

| App | `semanticObject` | `action` | Icon |
|---|---|---|---|
| Network Panel | `NetworkPanel` | `display` | `org-chart` |
| Governance & Compliance | `Compliance` | `manage` | `alert` |
| Franchisee Portal | `FranchiseePortal` | `display` | `home` |
| Onboarding | `Onboarding` | `manage` | `stage` |
| AI Recommendations | `Recommendations` | `display` | `ai` |

All share `sap.cloud.service: "myfranchise.service"` — Work Zone groups the tiles automatically.

**Steps to register in Work Zone after deploy:**
1. Work Zone Cockpit → Content Manager → Content Explorer
2. HTML5 Apps → select the apps
3. Add to Business Site → drag tiles onto the layout
4. Assign roles (`Franqueadora_Gestor`, `Franqueado`) to the site

> **Note (Work Zone cache):** when you change an app's `manifest.json`/annotations and redeploy, you must **remove and re-add** the app in the Content Explorer — Work Zone caches the content when it is added to the site.

> **Note (Franchisee attributes):** the IdP (IAS) does not send `unidade_ID`/`cluster` in the assertion and the Cockpit does not allow a static value. A CAP middleware (`srv/server.js`) injects the default (`u147`/`STD`) for anyone with the Franqueado role. In real production, map via IAS assertion attributes.

---

## Focus Case — Stock-out + Joule + Agent (under construction for 08/26)

> Proposal from business analyst **Camila**: prevent stock-outs at the franchisee's store.
> Evolution to include **Joule** (conversational copilot) and a **Restocking Agent** (automation). Scope confirmed for the 08/26 demo.

### 2.1 Why stock-out

A concrete, visual, and measurable pain in franchises: out of stock → lost sale → dissatisfied franchisee → brand damage. It closes the demo arc: today we show **compliance** risk (price); stock is the second operational risk, and it enables the **AI + agent** hook.

### 2.2 Current situation (gap)

The topic is **not addressed** today — merely decorative:

| Where "stock" appears | What it is | Handles stock-out? |
|---|---|---|
| `TipoRecomendacao` code `ESTOQUE` | category label | ❌ |
| AI Recommendations (text) | gpt-4o sometimes mentions "restocking" | ❌ no real data |
| `VendaPraticada.qtdVendida` | quantity sold | ⚠️ it's a sale, not a balance |

**There is no** entity/field for: stock balance, minimum/reorder point, lead time, coverage (days remaining), stock-out events.

### 2.3 Decision factors (what makes the case rich)

- **Regional seasonality** — the same product has different demand by region. Anchor example: **Havaianas in July sell high in the Northeast and low in the South**. Restocking needs to be differentiated by region/cluster, not uniform.
- **Promotions + calendar** — campaigns bring demand forward (e.g., Father's Day, summer). The agent takes the promotional calendar into account when calculating restocking.
- **Filter by region** — in the apps, filtering by region visually demonstrates the difference in turnover (South × Northeast) — a strong storytelling argument.

### 2.4 Data model to create

- `EstoqueUnidade` (SKU, balance, minimum, leadTime, coverage, criticality)
- `SazonalidadeRegional` (SKU/category × region × period → demand factor)
- `CalendarioPromocional` (campaign, period, affected SKUs/categories, region)
- `PedidosReposicao` (generated by the agent: SKU, qty, supplier, deadline, approval status)

Reuses ~70% of the **Compliance Deviations** pattern (detection → criticality → AI recommendation).

### 2.5 Joule — conversational copilot (checks)

Joule consumes the OData/CAP entities/actions as **skills**. The same check available in the apps, done by chat in natural language:

- *"Which stores are at critical risk today?"* → `Saude_Dashboard`
- *"Why is Store 147 red?"* → cross-references `Desvios` + `KPI_Unidade`
- *"Will I have a Havaianas stock-out in the Northeast in July?"* → stock + regional seasonality + calendar
- *"Which SKUs to restock before the summer campaign?"* → coverage + promotions

Reinforces the message: **one platform, multiple ways to access** (app + chat).

### 2.6 Restocking Agent — automation (levels 1→3)

Pattern: **detect → reason (gpt-4o) → act (CAP action) → record**, on top of AI Core + BPA.

| Level | What it does | Basis |
|---|---|---|
| **1 — Detect & Recommend** | Monitors coverage; when `cobertura < ponto_reposição` (adjusted by regional seasonality + promotions), generates a restocking recommendation via gpt-4o | evolution of `recommendations-job.js` |
| **2 — Propose the action** | Assembles the concrete order: SKU, quantity (turnover × lead time × regional seasonal factor), supplier, deadline — ready for 1 click | new: `PedidosReposicao` |
| **3 — Execute (human-in-the-loop)** | Creates the replenishment order and sends it for approval; the human only approves | SAP Build Process Automation |

*(Level 4 — autonomous with guardrails by value/criticality — remains on the roadmap.)*

### 2.7 Integrated flow (demo narrative)

1. **Joule** (manager): *"Is there a risk of a Havaianas stock-out in the Northeast?"* → *"Yes, 3 stores with coverage < 5 days and the summer campaign starts in 2 weeks."*
2. Manager: *"Solve this."* → triggers the **Restocking Agent**
3. The agent calculates with the Northeast's seasonal factor, assembles the orders, and sends them for approval (BPA)
4. Manager approves → stock-out avoided
5. Traceable in the apps

Demonstrates the 3 levels: **analytics (see) → AI (understand/recommend) → agent (act)**.

### 2.8 Full process (BPMN)

Flow to detail in BPMN (from the risk signal to replenishment):

```
[Venda registrada] → [Recalcular cobertura por SKU/loja]
     → <cobertura < ponto de reposição?> --não--> [fim]
                    |sim
     → [Ajustar por sazonalidade regional + calendário promocional]
     → [Agente: calcular qtd + fornecedor + prazo (gpt-4o)]
     → [Criar PedidoReposicao (status: PENDENTE)]
     → [BPA: enviar para aprovação]
     → <aprovado?> --não--> [registrar recusa] → [fim]
                   |sim
     → [Disparar reabastecimento] → [Atualizar estoque previsto]
     → [Notificar franqueado] → [fim]
```

### 2.9 Schedule risk

There are ~4 weeks left until 08/26 and the 5 apps + AI are already ready and validated. This case is a **significant new build** (model + Joule + agent + BPA). Recommended sequence: (1) model + seed with regional seasonality; (2) detection + AI recommendation (level 1-2); (3) Joule over the entities; (4) level 3 agent + BPA. Prioritize what supports the Havaianas South×Northeast narrative; cut scope if it compromises the demo rehearsal (Live Demo Quality = 20%).

---

## Phase 2 (post-competition)

- **Expansion Analysis** module — location scoring + map extension (Flexible Programming Model)
- **SAP Analytics Cloud** — executive dashboards for the board
- **SAP Datasphere** — data federation from multiple sources
- **SAP Build Process Automation** — approval workflows (compliance / onboarding)
- **SAP Event Mesh** — real-time alerts
- **Mobile Development Kit (MDK)** — if an offline requirement arises

---

## References

- [CAP Documentation](https://cap.cloud.sap/docs/)
- [SAP Fiori Elements Feature Showcase](https://github.com/SAP-samples/fiori-elements-feature-showcase)
- [OData Annotation Vocabulary](https://ui5.sap.com/#/topic/030faebe70b34198b17a93b4c6e7b4d7)
- [SAP Build Work Zone](https://help.sap.com/docs/build-work-zone-standard-edition)
- [SAP AI Core + GenAI Hub](https://help.sap.com/docs/sap-ai-core)
