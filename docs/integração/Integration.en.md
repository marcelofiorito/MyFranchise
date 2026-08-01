# RunMyFranchise — Technical Analysis: SAP Retail Portfolio vs. Franchise Management

[🇧🇷 Português](Integração.md) · **🇬🇧 English**

**Project:** RunMyFranchise  
**Context:** Dragons' Den 2026 — Side-by-Side Extension on SAP BTP  
**Target audience:** SAP Solution Advisors / Technical-Executive Panel  
**Date:** July 2026

---

## 1. Executive Summary

SAP has one of the most comprehensive retail portfolios on the market. Even so, no standard SAP product addresses the core problem of a franchisor: **orchestrating processes across hundreds of independent franchisees, with unified visibility, brand compliance, and per-store personalized artificial intelligence.**

RunMyFranchise is a BTP Side-by-Side extension that fills exactly this gap. This document maps where the SAP portfolio ends, where RunMyFranchise begins, and how the process of **stock-out prevention with regional seasonality** illustrates the value proposition with technical precision and measurable business impact.

---

## 2. The Business Process Demonstrated: Stock-Out Prevention and Regional Seasonality

### The real problem

A franchise network such as Havaianas flip-flops faces a logistics paradox in July: while stores in the **Northeast** sell at an accelerated pace (regional summer, tourism, demand 1.8× the average), stores in the **South** are in the middle of winter and turnover falls to 0.4× the average. A uniform replenishment order wastes working capital in the South and causes stock-outs in the Northeast.

### How RunMyFranchise solves it

The solution implements a **Replenishment Agent** (`srv/ai/reposicao-agent.js`) that operates with three layers of intelligence:

1. **Risk detection** — calculates `coberturaDias = saldoAtual ÷ (giroMedioDiario × fatorSazonal × upliftPromocional)`. If `coberturaDias < leadTimeDias`, the item is at real risk of stock-out before a replenishment order can arrive.

2. **Regional seasonality** — the `Sazonalidade_Regional` entity stores the demand factor by `categoria × região × mês`. For Sandals in July in the Northeast: factor 1.8. In the South: 0.4. This factor is applied dynamically, without hardcoded values.

3. **Order generation with natural-language justification** — when SAP AI Core is available, the agent invokes **gpt-4o via SAP GenAI Hub** with a structured prompt citing balance, coverage in days, lead time, and regional seasonality. The model returns a JSON array with suggested quantity, supplier, and textual justification.

4. **Human approval** — orders are created with status `PENDENTE`. No order is sent automatically. The approver reviews via SAP Fiori Elements before confirming — a *human-in-the-loop* pattern in line with regulatory requirements for procurement processes.

The status flow is: `PENDENTE → APROVADO / RECUSADO → ENVIADO → RECEBIDO`.

**Responsible AI guardrails:** The agent operates with a structured prompt that includes exclusively factual data extracted from the CDS model (current balance, coverage in days, seasonal factor, lead time). The LLM generates the justification narrative — not the quantity figures or calculation factors. Any discrepancy between the model's suggestion and the actual data is detectable by the human approver on the Fiori review screen. Additionally, SAP AI Launchpad allows monitoring of deployments, inference logs, and token consumption of the agent in production.

---

## 3. SAP Retail Portfolio: What Each Product Covers

| SAP Product | Primary domain | Relevant capability for retail/franchises |
|---|---|---|
| **S/4HANA (MM/SD/WM/EWM)** | ERP core | Materials management, purchase orders, stock movements, WMS in own distribution centers |
| **SAP CAR (Customer Activity Repository)** | POS Analysis | Aggregation of point-of-sale transactions, real-time demand sensing, sales history by store/SKU |
| **SAP IBP (Integrated Business Planning)** | Demand planning | Statistical forecasting, network-level seasonality adjustment, collaborative S&OP between supplier and retailer |
| **SAP Omnichannel POS (Unified POS / POS DM)** | Point of sale | Transaction processing, loyalty integration, real-time sales data for CAR |
| **SAP Ariba** | Procurement | Supplier management, contracts, quotations, purchase orders with approval |
| **SAP Analytics Cloud (SAC)** | BI / Executive dashboards | Performance reports, network dashboards, ad hoc analyses with S/4HANA and CAR data |
| **SAP Datasphere** | Data federation | Unified semantic layer, heterogeneous source connectivity, data mesh |
| **SAP Commerce Cloud (Hybris)** | B2C/B2B e-commerce | Digital catalog, online store, integration with S/4HANA for pricing and inventory |
| **SAP Emarsys** | Marketing / CRM | Personalized campaigns, end-customer engagement, email/push automation |

### What none of these products resolves natively

None of the products in the table above has a **franchise management module for retail/consumer goods**. There is no solution in the standard SAP portfolio that:

- Maintains the record of each franchisee as an independent legal entity with CNPJ, contract, health score, and individualized compliance rules;
- Detects price deviations *at the franchisee's store* relative to the franchisor's catalog;
- Generates per-store personalized action recommendations using AI, considering the performance cluster and geographic region;
- Offers the franchisee a self-service portal to track their own KPIs, deviations, onboarding tasks, and replenishment orders — with full data isolation between competing franchisees.

> **Technical note:** SAP S/4HANA On-Premise has a module called *"Distribution Franchisee Management"*, specific to the **Utilities industry in India** — where franchisees perform meter readings, bill distribution, and payment collection for energy utilities. This module does not apply to the retail/consumer goods franchise model, where the franchisee is an independent commercial entity managing its own store, catalog, pricing, and inventory with operational autonomy.

IBP, for example, is capable of planning at individual location granularity (location-product) and applying seasonal factors via DDMRP (Demand-Driven Replenishment). However, it does not model the **franchisor-franchisee contractual relationship**: it does not maintain a health score per unit, does not manage brand compliance, does not generate AI-contextualized recommendations per store, and does not offer a self-service portal with data isolation between competing legal entities. IBP does not know that store `u147-Porto Alegre` has a different franchisee from store `u189-Fortaleza`, with distinct operational autonomy, a separate contract, and individualized communication needs.

> **Roadmap:** The *SAP Retail Planning Hub* (H1/H2 2026) is introducing native demand forecasting and replenishment capabilities for individual stores in the Public Cloud. These capabilities complement — and do not replace — the franchise network orchestration layer that RunMyFranchise provides, as they do not address franchisor-franchisee relationship management.

---

## 4. The Franchise Gap — The Side-by-Side Extension

RunMyFranchise operates as a **CAP (Cloud Application Programming Model) extension** on SAP BTP. It does not replace S/4HANA — it extends what it does not cover. The architecture is deliberately side-by-side: operational data lives in the SAP core, franchise network intelligence lives in BTP.

The modules covered by RunMyFranchise and absent from the standard portfolio:

| RunMyFranchise Module | Problem solved | Why standard SAP does not solve it |
|---|---|---|
| **Network Dashboard** | Health score per unit (performance + compliance + contract) with criticality and cluster benchmark | SAC shows KPIs, but does not have the concept of "franchisee" as an entity with its own score |
| **Price Compliance** | Automatic detection of deviation between the practiced price and the franchisor's catalog | S/4HANA does not access the price practiced at the franchisee's store (independent system) |
| **AI Recommendations** | Personalized recommendations generated by gpt-4o via SAP AI Core, contextualized by store and region | SAP Joule is an assistant; it does not generate proactive recommendations per network unit |
| **Replenishment Agent** | Replenishment orders with regional seasonality and human approval | IBP plans the supply chain; it does not manage the relationship with the independent franchisee nor generate natural-language justifications |
| **Franchisee Portal** | Isolated view (by `unidade_ID`) of KPIs, deviations, replenishment, and recommendations | There is no native self-service portal for franchisees in the SAP portfolio |
| **Onboarding** | Store opening workflow with traceable steps, documents, and approvals | S/4HANA has workflow capabilities, but not a pre-configured franchise onboarding process |
| **Seasonal Inventory** | Coverage calculated with regional factor × promotional calendar in real time per store | IBP supports DDMRP by location, but does not contextualize with the franchisee's contractual profile nor trigger personalized alerts per unit |

---

## 5. Domain Mapping: Proprietary System by Process

| Process in demo | Proprietary SAP system in production | RunMyFranchise fills the gap in |
|---|---|---|
| Inventory monitoring (balance, turnover, coverage) | S/4HANA MM / WM — via inventory API | Coverage calculation with regional seasonality; alert per franchised store |
| Sales reading by SKU/store | SAP CAR ← SAP POS DM | Detection of practiced price deviation; generation of contextualized order |
| Seasonal demand planning | SAP IBP | Seasonal factor by category × region × month applied in real time at the store |
| Replenishment order to supplier | SAP Ariba (quotation/contract) | Order draft with natural-language justification; franchisor approval |
| Network executive dashboard | SAP Analytics Cloud | Individual health score per unit; anonymized benchmark by cluster |
| Communication with the franchisee | SAP Emarsys / email | Self-service portal isolated by `unidade_ID` with secure OData (XSUAA + instance-based auth) |
| New store opening | Multiple systems (Ariba, S/4HANA, BPA) | Unified onboarding workflow: steps, tasks, documents, approvals |

---

## 6. Data Flow: Demo vs. Production

### Demo (current — CSV seed data in HANA Cloud)

```
CSV seed data (db/data/*.csv)
    │
    ▼
SAP HANA Cloud (BTP) — modelo CDS
    │
    ▼
CAP OData API (/franqueadora, /franqueado)
    │
    ├─► SAP AI Core / GenAI Hub (gpt-4o) — justificativa da reposição
    │
    └─► SAP Fiori Elements (6 apps) — painel, compliance, estoque, recomendações, onboarding, portal
```

### Production (recommended path with SAP integration)

```
SAP POS DM / Unified POS ──► SAP CAR
    (transações em tempo real)       │
                                     ▼
                             SAP S/4HANA MM
                             (posição de estoque)
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         SAP Event Mesh                    SAP Integration Suite
    (eventos de movimentação               (APIs síncronas: leitura
     de estoque — push)                    de saldo, criação de PO)
                    │                                 │
                    └────────────────┬────────────────┘
                                     ▼
                          SAP BTP — RunMyFranchise
                          (CAP + HANA Cloud)
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              SAP AI Core      SAP Work Zone     SAP Ariba
            (gpt-4o / Joule)  (portal franqueado) (PO aprovado)
                                     │
                                     ▼
                           SAP Datasphere
                      (federação para SAC / analytics)
```

Integration with the ERP core operates in two complementary modes:

- **SAP Event Mesh** (publish-subscribe pattern): S/4HANA emits Business Events via Enterprise Event Enablement when relevant stock movements occur. RunMyFranchise consumes these events in real time to recalculate coverage and trigger stock-out alerts — without polling and without data replication.
- **SAP Integration Suite** (synchronous APIs): for operations requiring on-demand reads (point-in-time balance query) or writes (Purchase Order creation in Ariba), the Integration Suite acts as a bus with centralized routing, transformation, and security.

**SAP Datasphere** can federate data from CAR and S/4HANA to enrich the agent's context without data movement.

---

## 7. Joule and the Role of the Conversational Copilot

> **Status:** ✅ **In production** — MCP Server deployed on Cloud Foundry (`joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com`). End-to-end approval flow validated with 6 orders via natural language.

**SAP Joule** is integrated with RunMyFranchise via **MCP Server (Model Context Protocol)**, transforming analytical checks into natural conversations. The copilot already answers queries and executes approvals in production:

- *"Which stores are at risk of sandal stock-outs in the Northeast this week?"* → `get_lojas_em_risco(regiao='NE', categoria='Sandálias')`
- *"How many units of Havaianas Top did the agent suggest for Recife?"* → `get_cobertura_estoque(unidade_id='u178', sku='SKU-100')`
- *"What is the average health score of stores in the STD cluster?"* → `get_score_rede()`
- *"Approve all pending Havaianas orders"* → `get_pedidos_pendentes()` + `aprovar_pedido(pedido_id=...)` × N

### MCP Server — 7 tools in production

| Tool | OData Entity | Operation |
|---|---|---|
| `get_lojas_em_risco` | `Estoque_Unidade` | Stores with `estoqueCriticality < 3`, sorted by coverage |
| `get_cobertura_estoque` | `Estoque_Unidade` | Coverage in days for a specific store/SKU |
| `get_pedidos_pendentes` | `Pedidos_Reposicao` + `Unidades` | Orders awaiting approval |
| `get_recomendacoes` | `Recomendacoes` + `Unidades` | AI recommendations (status=NOVA) |
| `get_score_rede` | `Saude_Dashboard` | Network-wide health scores |
| `aprovar_pedido` | Bound action `FranqueadoraService.aprovar` | POST — PENDENTE → APROVADO |
| `recusar_pedido` | Bound action `FranqueadoraService.recusar` | POST — PENDENTE → RECUSADO |

**Auth:** OAuth2 `client_credentials` via XSUAA. CSRF token fetched automatically before each POST. Full documentation: `docs/integração/mcp-server.md`.

### Post-demo roadmap: Joule Capability via A2A

In the future evolution, RunMyFranchise can be registered as a **Joule Capability** via the **A2A (Agent-to-Agent)** protocol, allowing Joule to access the MCP Server as a native capability inside Work Zone. In this model, the intermediate agent (CAP-based or LangGraph) exposes OData actions via an A2A card. The current MCP architecture is the stepping stone for this integration. This completes the arc: from **data** (S/4HANA + CAR) to **intelligence** (gpt-4o via AI Core) to **conversation** (Joule via MCP → A2A).

---

## 8. Security Model and Data Isolation

Isolation between franchisees is implemented via **instance-based authorization** with XSUAA and SAP Cloud Identity Services (IAS):

- Each franchisee user receives a custom attribute `unidadeId` in IAS/XSUAA during onboarding.
- CAP applies automatic filters on all OData queries via `@restrict` annotations with `where: 'unidade_ID = $user.unidadeId'`.
- No cross-franchisee query is possible without the `FranqueadoraAdmin` role.
- The pattern is **single-tenant with row-level security** — suitable for networks of up to hundreds of units. For multi-tenant SaaS scale (multiple franchisor networks), CAP supports promotion to the `@multitenancy` model with isolated subscriber tenants.

This design ensures that franchisee A never accesses franchisee B's data — even if both operate on the same application instance.

---

## 9. The Value Proposition

RunMyFranchise does not compete with the SAP portfolio — **it presupposes it**. It is the orchestration layer that connects:

- **S/4HANA** (the source of truth for inventory and materials)
- **AI Core / GenAI Hub** (intelligence generated by the LLM with real store data)
- The **franchisee** (who today has no direct access to any of these systems)

The side-by-side extension on BTP is the architectural pattern SAP recommends for exactly this scenario: when the business process requires logic that goes beyond what the core product delivers natively, without core customizations that impede upgrades.

For franchise networks, this gap is structural and will not be filled by core products in the short term — the franchise model presupposes independent legal entities, which creates access, data isolation, and personalization complexities that the standard ERP was not designed to address.

RunMyFranchise is the technical answer to this gap, built on the SAP BTP stack, with zero dependency on third-party products for the infrastructure layer, and ready to integrate with the complete SAP portfolio in phase 2.

---

## 10. Source-to-Target Mapping: Demo Data Model × SAP Solutions in Production

This section maps **each entity in the CDS model** used in the demo to the proprietary SAP system in production, including the specific API/module, the data flow direction, and the integration mechanism.

### 10.1 Domain Entities — Complete Mapping

| RunMyFranchise Entity (CDS) | Key fields | Proprietary SAP system (production) | SAP API / Module | Flow direction | Integration mechanism |
|---|---|---|---|---|---|
| **Franqueados** | `ID`, `cnpj`, `razaoSocial`, `nomeFantasia`, `contratoInicio`, `contratoFim`, `status`, `cluster` | **SAP S/4HANA** (Business Partner) | API_BUSINESS_PARTNER (OData V4) — Role: `FLVN01` (Vendor/Franchisee) | BTP ← S/4HANA | SAP Integration Suite (sync pull) |
| **Unidades** | `ID`, `franqueado_ID`, `nome`, `cidade`, `estado`, `regiao`, `scoresSaude`, `criticality` | **SAP S/4HANA** (Plant / Sales Org) | API_PLANT / API_SALESORGANIZATION + BTP Extension (calculated score) | BTP ← S/4HANA + local calculation | Integration Suite + Event Mesh (plant changes) |
| **Estoque_Unidade** | `unidade_ID`, `material_ID`, `saldoAtual`, `giroMedioDiario`, `ultimaAtualizacao` | **SAP S/4HANA MM** | API_MATERIAL_STOCK (stock position by plant) | BTP ← S/4HANA | Event Mesh (Goods Movement events) |
| **Materiais** | `ID`, `descricao`, `categoria`, `sku`, `fornecedor_ID`, `leadTimeDias`, `precoSugerido` | **SAP S/4HANA MM** | API_PRODUCT (Master Data) | BTP ← S/4HANA | Integration Suite (sync pull / delta) |
| **Sazonalidade_Regional** | `ID`, `categoria`, `regiao`, `mes`, `fatorDemanda` | **SAP IBP** (Demand Planning) or **BTP extension** | IBP: Planning Areas with dimension Location × Product Group × Time / BTP: local table managed by the franchisor | BTP ← IBP (if available) or local data | CI-DS (Cloud Integration for Data Services) / manual |
| **Pedidos_Reposicao** | `ID`, `unidade_ID`, `material_ID`, `quantidade`, `fornecedor_ID`, `status`, `justificativaIA`, `dataCriacao`, `dataAprovacao` | **SAP Ariba** (Purchase Order) / **SAP S/4HANA MM** (PO) | API_PURCHASEORDER_PROCESS_SRV (PO creation) / Ariba Procurement API | BTP → S/4HANA/Ariba | Integration Suite (sync push — after approval) |
| **Vendas_Diarias** | `unidade_ID`, `material_ID`, `data`, `quantidadeVendida`, `precoUnitarioPraticado`, `receita` | **SAP CAR** (Customer Activity Repository) ← SAP POS DM | CAR POS Inbound API / ODP (Operational Data Provisioning) | BTP ← CAR | Integration Suite (batch daily) or Datasphere (federation) |
| **Desvios_Preco** | `ID`, `unidade_ID`, `material_ID`, `precoSugerido`, `precoPraticado`, `percentualDesvio`, `dataDeteccao`, `status` | **Calculated in BTP** (comparison of Vendas_Diarias vs. Materiais.precoSugerido) | Does not exist in standard SAP — 100% BTP logic | Internal BTP | N/A (local CAP calculation) |
| **Recomendacoes_IA** | `ID`, `unidade_ID`, `tipo`, `titulo`, `descricao`, `prioridade`, `status`, `dataCriacao`, `modeloIA` | **SAP AI Core** (GenAI Hub — gpt-4o) | GenAI Hub Inference API (`/v2/inference/deployments/{id}/invoke`) | BTP ↔ AI Core | SDK @sap-ai-sdk/ai-api (direct call) |
| **Onboarding_Fluxos** | `ID`, `unidade_ID`, `etapa`, `responsavel`, `status`, `dataInicio`, `dataConclusao`, `documentoUrl` | **SAP Build Process Automation** (workflow) / BTP extension | SPA Workflow API / local CAP table | BTP ↔ SPA | Destination Service (if SPA) or local |
| **Calendario_Promocional** | `ID`, `nome`, `dataInicio`, `dataFim`, `categorias`, `upliftEsperado`, `regioes` | **SAP Emarsys** (Campaign Calendar) or **BTP extension** | Emarsys API / locally managed table | BTP ← Emarsys or local data | Open Connectors / REST adapter |
| **Usuarios_Franqueado** | `ID`, `unidade_ID`, `email`, `nome`, `role`, `ultimoAcesso` | **SAP Cloud Identity Services (IAS)** | SCIM API (Identity Directory) + XSUAA (authorization) | BTP ← IAS | IAS provisioning / XSUAA runtime |
| **Scores_Saude** | `unidade_ID`, `periodo`, `scorePerformance`, `scoreCompliance`, `scoreContrato`, `scoreGeral`, `cluster` | **Calculated in BTP** (multi-source KPI aggregation) | Does not exist in standard SAP — 100% BTP logic | Internal BTP | N/A (local CAP calculation) |

### 10.2 Data Flow by Business Process

#### Process 1: Stock-Out Detection and Replenishment Order

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ FLUXO: Prevenção de Ruptura com Sazonalidade Regional                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ① SAP S/4HANA MM                                                                  │
│     Goods Movement Event (MIGO)                                                     │
│         │                                                                           │
│         ▼ [Event Mesh — topic: sap/s4/beh/materialdocument/v1/MaterialDocument/Created]│
│                                                                                     │
│  ② SAP BTP — RunMyFranchise                                                        │
│     CAP Event Handler: on("MaterialDocument.Created")                               │
│         │                                                                           │
│         ├──► Atualiza Estoque_Unidade.saldoAtual                                   │
│         │                                                                           │
│         ▼                                                                           │
│     srv/ai/reposicao-agent.js                                                       │
│         │                                                                           │
│         ├──► Lê Sazonalidade_Regional (categoria × região × mês)                   │
│         ├──► Lê Calendario_Promocional (uplift vigente)                             │
│         ├──► Calcula: coberturaDias = saldo ÷ (giro × fatorSazonal × uplift)       │
│         │                                                                           │
│         ▼ [Se coberturaDias < leadTimeDias]                                         │
│                                                                                     │
│  ③ SAP AI Core / GenAI Hub                                                         │
│     POST /v2/inference/deployments/{id}/invoke                                      │
│     Payload: {saldo, cobertura, leadTime, sazonalidade, historico}                  │
│         │                                                                           │
│         ▼ Response: {quantidade_sugerida, fornecedor, justificativa_texto}          │
│                                                                                     │
│  ④ SAP BTP — RunMyFranchise                                                        │
│     Cria Pedidos_Reposicao (status: PENDENTE)                                       │
│         │                                                                           │
│         ▼ [Aprovação humana via Fiori Elements]                                     │
│                                                                                     │
│  ⑤ SAP S/4HANA MM / SAP Ariba                                                     │
│     POST API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder                              │
│     [via Integration Suite — após status = APROVADO]                                │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### Process 2: Price Compliance

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ FLUXO: Detecção de Desvio de Preço Praticado                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ① SAP POS DM → SAP CAR                                                           │
│     Transação de venda (preço unitário praticado por item)                          │
│         │                                                                           │
│         ▼ [Integration Suite — batch diário ou Datasphere federation]               │
│                                                                                     │
│  ② SAP BTP — RunMyFranchise                                                        │
│     Ingest: Vendas_Diarias (unidade, material, precoUnitarioPraticado)             │
│         │                                                                           │
│         ├──► Compara com Materiais.precoSugerido (tolerância ±X%)                  │
│         │                                                                           │
│         ▼ [Se |desvio| > tolerância]                                                │
│                                                                                     │
│     Cria Desvios_Preco (status: ABERTO)                                            │
│         │                                                                           │
│         ├──► Impacta Scores_Saude.scoreCompliance da unidade                       │
│         └──► Notificação ao franqueado (portal / e-mail)                           │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### Process 3: Unit Health Score

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ FLUXO: Cálculo do Score de Saúde (executado periodicamente — cron job CAP)         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  Fontes de dados:                                                                   │
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│  │ Vendas_Diarias  │  │ Desvios_Preco   │  │ Franqueados     │                    │
│  │ (performance)   │  │ (compliance)    │  │ (contrato)      │                    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                    │
│           │                     │                     │                             │
│           ▼                     ▼                     ▼                             │
│  ┌─────────────────────────────────────────────────────────────┐                   │
│  │ srv/scores/health-calculator.js                             │                   │
│  │                                                             │                   │
│  │ scorePerformance = f(receita, giro, crescimento vs cluster)│                   │
│  │ scoreCompliance  = f(desvios_abertos, recorrência)         │                   │
│  │ scoreContrato    = f(diasParaVencimento, pendências)       │                   │
│  │ scoreGeral       = média ponderada (40% perf, 40% comp,   │                   │
│  │                    20% contrato)                            │                   │
│  └─────────────────────────────┬───────────────────────────────┘                   │
│                                 │                                               │
│                                 ▼                                               │
│  Scores_Saude (persistido) + Unidades.criticality (atualizado)                     │
│         │                                                                           │
│         └──► SAP Analytics Cloud (via Datasphere — federation para dashboards)     │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 SAP API Mapping by Entity (Detailed Source-to-Target)

| Data in RunMyFranchise | Field(s) | SAP API in Production | Endpoint / Entity Set | Operation |
|---|---|---|---|---|
| Stock balance by plant | `saldoAtual` | S/4HANA — Material Stock | `API_MATERIAL_STOCK/A_MatlStkInAcctMod` | GET (filter: Plant + Material) |
| Material data (master) | `descricao`, `categoria`, `sku`, `leadTimeDias` | S/4HANA — Product Master | `API_PRODUCT_SRV/A_Product` | GET |
| Preferred supplier | `fornecedor_ID`, `leadTimeDias` | S/4HANA — Purchasing Info Record | `API_INFORECORD_PROCESS_SRV/A_PurchasingInfoRecord` | GET |
| Suggested price (catalog) | `precoSugerido` | S/4HANA — Condition Records (Pricing) | `API_SLSPRICINGCONDITIONRECORD_SRV` | GET |
| POS sales by store | `quantidadeVendida`, `precoUnitarioPraticado` | SAP CAR — POS Transaction | CAR ODP: `2LIS_13_VDITM` or POSDTA_INBOUND | GET (batch) |
| Franchisee data (BP) | `cnpj`, `razaoSocial`, `contratoInicio` | S/4HANA — Business Partner | `API_BUSINESS_PARTNER/A_BusinessPartner` | GET |
| Plant / Store (unit) | `nome`, `cidade`, `estado` | S/4HANA — Plant Master | `API_PLANT/A_Plant` (or custom field extension) | GET |
| Purchase Order creation | `quantidade`, `material_ID`, `fornecedor_ID` | S/4HANA — Purchase Order | `API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder` | POST |
| Goods movement (event) | — | S/4HANA — Material Document | Business Event: `sap.s4.beh.materialdocument.v1.MaterialDocument.Created` | Event (subscribe) |
| Demand forecast (if IBP) | `fatorDemanda` by location | SAP IBP — Planning View | IBP Cloud Integration CI-DS / OData API | GET (batch) |
| Promotional campaign | `upliftEsperado`, `dataInicio`, `dataFim` | SAP Emarsys — Campaign API | Emarsys Contact & Campaign API | GET |
| Franchisee user identity | `email`, `role`, `unidade_ID` | SAP Cloud Identity Services | SCIM 2.0 API (`/scim/Users`) | GET / provisioning |
| AI inference (justification) | `justificativaIA` | SAP AI Core — GenAI Hub | `/v2/inference/deployments/{deploymentId}/invoke` | POST |

### 10.4 SAP S/4HANA Events Consumed (Event Mesh)

| Event (CloudEvents type) | Trigger in S/4HANA | Action in RunMyFranchise |
|---|---|---|
| `sap.s4.beh.materialdocument.v1.MaterialDocument.Created` | Goods Receipt / Goods Issue (MIGO) | Updates `Estoque_Unidade`; triggers coverage calculation |
| `sap.s4.beh.purchaseorder.v1.PurchaseOrder.Changed` | PO status change (supplier confirmation) | Updates `Pedidos_Reposicao.status` → `ENVIADO` or `RECEBIDO` |
| `sap.s4.beh.businesspartner.v1.BusinessPartner.Changed` | Franchisee master data update | Updates `Franqueados` (address, status, contractual data) |
| `sap.s4.beh.product.v1.Product.Changed` | Material master data change | Updates `Materiais` (suggested price, lead time, description) |

### 10.5 OData Services Exposed by RunMyFranchise

| CAP Service | Path | Target users | Exposed entities | Authorization |
|---|---|---|---|---|
| **FranqueadoraService** | `/franqueadora` | Franchisor users (managers, analysts) | Franqueados, Unidades, Estoque_Unidade, Pedidos_Reposicao, Desvios_Preco, Recomendacoes_IA, Scores_Saude, Onboarding_Fluxos, Sazonalidade_Regional, Calendario_Promocional | Role: `FranqueadoraAdmin`, `FranqueadoraAnalista` |
| **FranqueadoService** | `/franqueado` | Franchisee users (store operators) | Unidades (filtered by unidade_ID), Estoque_Unidade, Pedidos_Reposicao, Desvios_Preco, Recomendacoes_IA | Role: `Franqueado` — filtered by `$user.unidadeId` |

### 10.6 Visual Summary: Source-to-Target by Layer

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CAMADA DE DADOS (Fontes)                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SAP S/4HANA          SAP CAR            SAP IBP           SAP Emarsys    SAP IAS      │
│  ┌──────────┐        ┌──────────┐       ┌──────────┐      ┌──────────┐  ┌──────────┐  │
│  │Material  │        │POS Trans │       │Demand    │      │Campaigns │  │Users     │  │
│  │Stock     │        │Sales Data│       │Forecast  │      │Calendar  │  │Groups    │  │
│  │Plant     │        │          │       │Seasonal  │      │          │  │Attributes│  │
│  │Bus.Partn.│        │          │       │Factors   │      │          │  │          │  │
│  │Purch.Ord.│        │          │       │          │      │          │  │          │  │
│  │Pricing   │        │          │       │          │      │          │  │          │  │
│  └────┬─────┘        └────┬─────┘       └────┬─────┘      └────┬─────┘  └────┬─────┘  │
│       │                    │                   │                  │             │        │
├───────┼────────────────────┼───────────────────┼──────────────────┼─────────────┼────────┤
│       │  CAMADA DE INTEGRAÇÃO                  │                  │             │        │
│       │                                        │                  │             │        │
│       ▼                    ▼                   ▼                  ▼             ▼        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                    SAP Integration Suite + SAP Event Mesh                        │   │
│  │                                                                                  │   │
│  │  • Event Mesh: subscrição a Business Events (push, real-time)                   │   │
│  │  • Integration Suite: iFlows para batch/sync (pull, scheduled)                  │   │
│  │  • API Management: governança de APIs expostas                                  │   │
│  │  • Open Connectors: adaptador para Emarsys                                     │   │
│  └──────────────────────────────────────────┬───────────────────────────────────────┘   │
│                                              │                                          │
├──────────────────────────────────────────────┼──────────────────────────────────────────┤
│       CAMADA DE APLICAÇÃO (BTP)              │                                          │
│                                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                    SAP BTP — RunMyFranchise (CAP + HANA Cloud)                   │   │
│  │                                                                                  │   │
│  │  Entidades locais:              Entidades derivadas:         Entidades de ação:  │   │
│  │  • Franqueados                  • Scores_Saude (calc.)      • Pedidos_Reposicao │   │
│  │  • Unidades                     • Desvios_Preco (calc.)     • Recomendacoes_IA  │   │
│  │  • Estoque_Unidade              • Calendario_Promocional    • Onboarding_Fluxos │   │
│  │  • Materiais                                                                     │   │
│  │  • Sazonalidade_Regional                                                        │   │
│  │  • Vendas_Diarias                                                               │   │
│  │  • Usuarios_Franqueado                                                          │   │
│  └──────────────────────────────────────────┬───────────────────────────────────────┘   │
│                                              │                                          │
├──────────────────────────────────────────────┼──────────────────────────────────────────┤
│       CAMADA DE INTELIGÊNCIA                 │                                          │
│                                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                    SAP AI Core — GenAI Hub (gpt-4o)                              │   │
│  │                                                                                  │   │
│  │  Input: {saldo, cobertura, leadTime, fatorSazonal, historico, cluster}          │   │
│  │  Output: {quantidade_sugerida, fornecedor, justificativa_texto}                 │   │
│  └──────────────────────────────────────────┬───────────────────────────────────────┘   │
│                                              │                                          │
├──────────────────────────────────────────────┼──────────────────────────────────────────┤
│       CAMADA DE APRESENTAÇÃO                 │                                          │
│                                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │          SAP Work Zone / SAP Fiori Elements (6 apps)                            │   │
│  │                                                                                  │   │
│  │  Franqueadora:                         Franqueado:                              │   │
│  │  • Painel da Rede (scores)             • Portal (KPIs da minha loja)           │   │
│  │  • Compliance de Preços (desvios)      • Pedidos de Reposição                  │   │
│  │  • Estoque Sazonal (cobertura)         • Recomendações IA                      │   │
│  │  • Recomendações IA (rede)                                                      │   │
│  │  • Onboarding (fluxos)                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. References

- [SAP S/4HANA Retail](https://www.sap.com/products/s4hana-erp.html)
- [SAP Customer Activity Repository](https://www.sap.com/products/customer-activity-repository.html)
- [SAP Integrated Business Planning](https://www.sap.com/products/ibp.html)
- [SAP IBP — Demand-Driven Replenishment (DDMRP)](https://help.sap.com/docs/SAP_INTEGRATED_BUSINESS_PLANNING/feae3cea3cc549aaa9d9de7d363a83e6/0503ebd965af4531b376b371b38f1e6c.html)
- [SAP Ariba](https://www.sap.com/products/spend-management/ariba-network.html)
- [SAP Analytics Cloud](https://www.sap.com/products/analytics-cloud.html)
- [SAP Datasphere](https://www.sap.com/products/datasphere.html)
- [SAP AI Core + GenAI Hub](https://help.sap.com/docs/sap-ai-core)
- [SAP Event Mesh — Enterprise Event Enablement](https://help.sap.com/docs/event-mesh)
- [SAP BTP — Side-by-Side Extensions](https://help.sap.com/docs/btp)
- [SAP BTP Developer's Guide — Side-by-Side CAP Extension](https://help.sap.com/docs/BTP/0c8c1db388f645159e134a005aaabbcf/2289e25a0e494f03867c195454b6eaea.html)
- [SAP Joule — Capabilities](https://help.sap.com/docs/JOULE/82a14f108cfa4d4788244d81371e072b/41de8c499c72413c8e134493686a5348.html)
- [SAP S/4HANA — Distribution Franchisee Management (Utilities)](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/181023b0d46f417b82eed136aa57029b/526df057f3944183a9460429f3b9903a.html)
- [SAP S/4HANA — Business Events (Enterprise Event Enablement)](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/8308e6d301d54584a33cd04a9861bc52/8cbf952e55364254be2da77aa1342aa5.html)
- [SAP S/4HANA — API_MATERIAL_STOCK](https://api.sap.com/api/API_MATERIAL_STOCK_SRV/overview)
- [SAP S/4HANA — API_PURCHASEORDER_PROCESS_SRV](https://api.sap.com/api/API_PURCHASEORDER_PROCESS_SRV/overview)
- [SAP S/4HANA — API_BUSINESS_PARTNER](https://api.sap.com/api/API_BUSINESS_PARTNER/overview)
- [SAP Cloud Identity Services — SCIM API](https://help.sap.com/docs/cloud-identity-services)
