# RunMyFranchise — Tropicália Co.

[🇧🇷 Português](README.md) · **🇬🇧 English**

> Operational intelligence platform for tropical fashion franchise networks on SAP BTP.

---

## Overview

**Tropicália Co.** is a Brazilian tropical fashion franchise with 7 stores across Brazil, Argentina, USA, and Portugal. The RunMyFranchise platform connects franchisor and franchisees in real time, with centralized data on HANA Cloud and SAP Joule as the AI co-pilot.

**Demo scenario:** Stockout crisis on the eve of the "Tropical Summer" campaign (launch: 2026-08-12). SP Jardins store is 2 days from running out of Tucano Flip Flop Ipanema Blue size 37-38 — NPS dropped from 9.2 to 5.4 with R$ 42,500 revenue at risk in that store alone.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Data | HANA Cloud — schema `RUNMYFRANCHISE_JG` |
| Semantic Layer | SAP Datasphere — Space `I831004` |
| Dashboards | SAP Analytics Cloud (SAC) — Live Connection via Datasphere |
| Portal | SAP Build Work Zone Advanced — UI Integration Cards + Apps |
| Backend | SAP CAP (Node.js) — `myfranchise-srv` |
| MCP / Joule | Node.js Express + `@modelcontextprotocol/sdk` — `myfranchise-mcp` |
| Frontend | SAP Fiori Elements (UI5) — 9 apps |
| AI | SAP Joule via MCP + SAP AI Core |
| Events | Advanced Event Mesh (AEM) |
| Deploy | SAP BTP Cloud Foundry — org `sa-build-platform-org`, space `DEV` |

---

## Data Architecture

The `RUNMYFRANCHISE_JG` schema (HANA Cloud) is the single source of truth:

```
S/4HANA Fashion Tables    →  MARA, MAKT, MAW1, FSH_COLLECTIONS, KLAH, KSSK, AUSP
Master Tables (M_*)       →  M_STORE, M_CAMPAIGN, M_SUBSTITUTE, M_ARTICLE_GRADE...
Transactional Tables      →  T_INVENTORY_SNAPSHOT, T_NPS, T_SELLOUT_HDR/ITM...
         ↓
Semantic Layer: CV_DIM_* (4 dimension views) + CV_FACT_* (4 fact views)
         ↓
Procedures: P_STOCKOUT_ALERT · P_SUBSTITUTE_SUGGEST · P_GENERATE_SELLIN_ORDER
         ↓
Datasphere (Space I831004): Remote Tables → Dimension Views → Fact Views → Analytic Models
         ↓
SAC (Live Connection) + Work Zone (Cards) + Joule (MCP — 7 tools)
```

---

## Active Stores

| Store ID | City | Country |
|---|---|---|
| BR-SP-001 | São Paulo (Jardins) | Brazil 🇧🇷 |
| BR-RJ-001 | Rio de Janeiro (Ipanema) | Brazil 🇧🇷 |
| BR-MG-001 | Belo Horizonte (Savassi) | Brazil 🇧🇷 |
| BR-RS-001 | Porto Alegre | Brazil 🇧🇷 |
| AR-BA-001 | Buenos Aires | Argentina 🇦🇷 |
| US-MIA-001 | Miami | USA 🇺🇸 |
| PT-LIS-001 | Lisbon | Portugal 🇵🇹 |

---

## MCP Server — SAP Joule

Joule accesses live data via the MCP Server deployed on CF.

**URL:** `https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com`
**BTP Destination:** `RunMyFranchise-MCP`
**Health check:** `GET /health`

| Tool | Description |
|---|---|
| `get_stockout_alert` | Stockout risk alerts by store/SKU with revenue at risk |
| `get_substitute_suggest` | In-stock substitutes with sales script |
| `generate_replenishment_order` | Generates DRAFT replenishment order with total cost |
| `get_demand_forecast` | Demand forecast with weather/campaign/seasonality factors |
| `get_nps_analysis` | NPS by store with verbatims and stockout correlation |
| `get_sellout_summary` | Revenue, top articles, and top stores |
| `get_store_overview` | 360° store snapshot: inventory + NPS + sales + forecast |

---

## Demo Scenario — Tropical Summer Crisis

**Demo date:** 2026-08-11 | **Campaign launches:** 2026-08-12

### Personas

| Persona | Role | Access |
|---|---|---|
| **Carlos Mendes** | Head of Operations — Franchisor HQ | All 7 stores |
| **Marina Santos** | Owner — SP Jardins (BR-SP-001) | Own store only |

### Key Numbers

| Indicator | Value |
|---|---|
| Stores at critical risk | 5 of 7 |
| Critical SKUs (network) | 87 |
| Revenue at risk (network) | R$ 125,000 |
| Revenue at risk SP Jardins | R$ 42,500 |
| SP Jardins NPS (Aug/2026) | 5.4 (was 9.2 in June) |
| SP Jardins detractors | 7 of 11 responses |
| Buenos Aires surplus stock | 178 units Tucano Ipanema Blue |
| Weather demand impact | +35% (heat wave 38°C in São Paulo) |
| Campaign impact | +25% |

### Demo Flow (~10 min)

1. **Carlos** opens Work Zone → sees network stockout alert card
2. **Carlos** drills into SAC → SP Jardins in red, NPS declining
3. **Carlos** asks Joule → full analysis + recommendation to alert franchisee
4. **Carlos** confirms sending notification to Marina
5. **Marina** receives alert in Work Zone → asks Joule for recommendation
6. **Joule** presents 3 options → recommends **Option C** (401% ROI)
7. **Marina** confirms order SI-2026-008 → status changes DRAFT → PENDING

---

## Deploy

```bash
# MCP Server (standalone, no mtar needed)
cf push myfranchise-mcp

# Set HANA password (NEVER commit)
DBPWD='...' && cf set-env myfranchise-mcp HANA_DBADMIN_PASSWORD "$DBPWD"
cf restart myfranchise-mcp

# Verify
curl https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com/health
```

> **Security:** `HANA_DBADMIN_PASSWORD` must never be committed to git. Always use `cf set-env` via a shell variable.

---

## Documentation

| Document | Content |
|---|---|
| [teste/DEMO_SCRIPT.en.md](teste/DEMO_SCRIPT.en.md) | Full demo script for Aug 26 with Joule prompts |
| [teste/tests.en.md](teste/tests.en.md) | Test questions to validate all 7 Joule tools |
| [docs/integração/joule.md](docs/integração/joule.md) | Joule Studio configuration guide |
| [docs/integração/mcp-server.md](docs/integração/mcp-server.md) | MCP Server technical reference |
| [docs/infraestrutura/sac-setup.md](docs/infraestrutura/sac-setup.md) | SAC Story Design — Franchise Network Dashboard |
