# Product Requirements Document
# RunMyFranchise — Franchise Network Management Platform

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | July 2026 |
| **Status** | In development |
| **Platform** | SAP Business Technology Platform (BTP) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Context and Motivation](#2-context-and-motivation)
3. [Problem](#3-problem)
4. [Solution](#4-solution)
5. [Users and Personas](#5-users-and-personas)
6. [Objectives and Success Metrics](#6-objectives-and-success-metrics)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [User Stories](#9-user-stories)
10. [Out of MVP Scope](#10-out-of-mvp-scope)
11. [Delivery Plan](#11-delivery-plan)
12. [Dependencies and Risks](#12-dependencies-and-risks)
13. [Open Questions](#13-open-questions)

---

## 1. Executive Summary

**RunMyFranchise** is a franchise network management platform built on top of the SAP Business Technology Platform (BTP). It centralizes into a single digital experience the view of network performance, operational compliance control, franchisee engagement, and the process of opening new units.

The product addresses a critical market gap: franchise networks with dozens to hundreds of units currently operate with high information fragmentation, manual compliance, and dependence on field teams for tasks that can be automated. This limits growth capacity and erodes brand quality.

**MVP:** Four integrated modules — Network Dashboard, Governance & Compliance, Franchisee Portal, and Onboarding — delivered on SAP CAP, Fiori Elements, and HANA Cloud, with generative artificial intelligence for proactive recommendations to the franchisee.

---

## 2. Context and Motivation

### Franchise Market in Brazil

Brazil is the fourth-largest franchise market in the world, with more than 3,000 networks and 170,000 units operating across the country (ABF 2025). The sector generated R$ 240 billion in revenue in 2024 and is growing at a rate of 12% per year. More than half of the networks plan to expand over the next two years.

Despite this growth, the operational management of networks remains predominantly manual: spreadsheets, emails, physical audit visits, and manually consolidated reports. Operational fragmentation is the main inhibitor of scale.

### Opportunity

The digitalization of franchise management is at an early stage in Brazil. Existing solutions are partial (CRM, royalties, ERP) and do not offer the integrated view that a growing franchisor truly needs. There is a clear market window for a platform that unites network visibility, automatic compliance, franchisee engagement, and standardized onboarding into a single experience.

### Why SAP BTP

SAP BTP offers the combination of:
- **CAP + HANA Cloud** for a scalable backend and high-performance analytical queries
- **Fiori Elements** for standardized enterprise-grade UX without high frontend development cost
- **AI Core + GenAI Hub** for native generative intelligence
- **Event Mesh** for a real-time event-driven architecture
- **Build Work Zone** for a multi-app corporate portal with no additional development
- **IAS + XSUAA** for secure multi-tenant identity management

---

## 3. Problem

### Core problem

Franchisors operating networks with 50+ units face operational growth disproportionate to network growth. Each new unit adds complexity that current processes do not absorb efficiently.

### Specific pain points identified

#### Visibility and decision-making

| Symptom | Impact |
|---|---|
| KPIs arrive 2–7 days late | Decisions based on outdated data |
| Each unit reports in a different format | Manual consolidation consumes days of team time per month |
| No normalized comparison between units | Impossible to identify positive or negative outliers |
| No segmentation by cluster (size, region, maturity) | Same benchmark for incomparable stores |

#### Compliance and brand standardization

| Symptom | Impact |
|---|---|
| On-site audit as the only control mechanism | High cost, low frequency, low coverage |
| Price and mix deviations discovered by customer service | Brand impact before correction |
| National campaigns without an adherence verification mechanism | Wasted marketing investment |
| Compliance rules documented but not monitored | Silent erosion of the brand standard |

#### Relationship with franchisees

| Symptom | Impact |
|---|---|
| Franchisee does not know how they stand relative to the network | Low engagement, feeling of isolation |
| High volume of operational tickets at headquarters | High support cost, overloaded team |
| Headquarters guidelines arrive distorted or do not arrive | Fragmented execution of the strategy |
| Lack of proactive guidance to the franchisee | Improvement opportunities unrealized |

#### Expansion and onboarding

| Symptom | Impact |
|---|---|
| Opening a new unit takes 4–6 months | Loss of market windows |
| Process managed by email and spreadsheet | No progress visibility, high risk of delay |
| Expansion decision based on experience and intuition | Suboptimal allocation of investment |
| Onboarding scalability does not keep pace with the growth plan | Operational bottleneck in growth |

---

## 4. Solution

### Product vision

A platform that transforms the relationship between franchisor and franchisees: from reactive, fragmented management to proactive, data-driven monitoring — with intelligence that scales along with the network.

### Value proposition

**For the franchisor:**
- Consolidated view of the entire network in real time, without manual consolidation
- Automatic compliance: deviations detected without on-site auditors
- Standardized onboarding that reduces opening time from months to weeks
- A reliable database for expansion decisions

**For the franchisee:**
- Visibility of their own performance and relative position in the network
- Proactive guidance with AI-generated action recommendations
- A single communication channel with headquarters
- Clarity about what is pending and what needs to be done

### High-level architecture

```
Franqueadora                    Franqueado
(Fiori/Work Zone)               (Fiori/Work Zone responsivo)
       │                               │
       └──────────┬────────────────────┘
                  │ OData V4
            SAP CAP (CF)
                  │
      ┌───────────┼───────────────┐
  HANA Cloud   Event Mesh    AI Core
  (dados)      (alertas)   (recomendações)
      │
  Integration Suite ← POS/ERP/Planilhas
```

---

## 5. Users and Personas

### Persona 1 — Franchisor Manager (primary)

**Representative:** Alexandre Mendes, Director of Operations and Expansion

**Profile:**
- Responsible for 280 stores in operation
- Objective: double the network in 3 years
- Availability: full schedule, accesses the dashboard mainly on Monday mornings
- Frustrations: data arrives late, too much time spent on consolidation, compliance done by hand

**Jobs to be done:**
- Quickly identify which units need attention without reading a report
- Ensure the brand is being preserved across all units
- Make expansion decisions based on performance data by market
- Present results and plans to the board with reliable data

**Channels:** Desktop (Fiori Elements via Build Work Zone), reports exported for presentations

---

### Persona 2 — Franchisee (secondary)

**Representative:** Roberto Mendes, owner of Store 147 (Porto Alegre)

**Profile:**
- Operates 1 Standard unit in the fashion/lifestyle segment
- Focus: store results, not systems management
- Accesses mainly via mobile phone
- Needs clear guidance, not complex dashboards

**Jobs to be done:**
- Know whether the store is doing well or poorly (compared to the network)
- Understand what headquarters is asking for and when a response is needed
- Receive practical guidance on what to do to improve

**Channels:** Mobile browser (responsive, no native app), push notifications via Work Zone

---

### Persona 3 — Expansion Analyst (tertiary, Phase 2)

**Profile:** Evaluates and prioritizes new markets for opening. Uses performance data from existing units to project the potential of new ones.

**Jobs to be done:** Market scoring, geographic analysis, benchmarks by city profile

---

## 6. Objectives and Success Metrics

### Strategic objectives

| Objective | Description |
|---|---|
| **Operational scalability** | Double the network without doubling the support team |
| **Brand standardization** | Zero price and mix deviations over 7 days without correction |
| **Expansion speed** | Reduce opening lead time from 4–6 months to less than 6 weeks |
| **Franchisee engagement** | Franchisee accesses the portal at least 2x per week |
| **Data-driven decisions** | 100% of expansion decisions supported by performance data |

### Product KPIs (MVP)

| KPI | Baseline (today) | Target |
|---|---|---|
| Time to consolidated network view | D+2 to D+7 | Real time (< 1h after ingestion) |
| Compliance deviations detected automatically | 0% | 100% |
| Average time to open a new unit | 16–24 weeks | 6 weeks |
| Report consolidation time (h/week) | 8–15h per analyst | < 1h |
| Franchisee NPS with headquarters | Not measured | > 60 within 12 months |
| Volume of operational tickets to headquarters | Baseline to be measured | 40% reduction in 6 months |

---

## 7. Functional Requirements

### 7.1 Module: Network Dashboard

**Objective:** Provide the franchisor with a consolidated view of all units in real time, with cluster segmentation and automatic alerts.

**Fiori Floorplan:** Analytical List Page (ALP) + Object Page

#### RF-NET-01 — Health Score per Unit
- The system must automatically calculate a Health Score (0–100) for each unit
- Formula: 40% performance relative to the cluster + 40% compliance + 20% contract status
- The score must be recalculated automatically when new KPIs or deviations are recorded
- The score must be displayed with a visual traffic light: green (≥70), yellow (45–69), red (<45)

#### RF-NET-02 — Consolidated View (ALP)
- The dashboard must display all units in an analytical list with a distribution chart by score
- Mandatory columns: Store, Cluster, Region, Health Score, Revenue, MoM Growth, Open Alerts, Contract Status
- The distribution chart must show the proportion of units in each score range (green/yellow/red)
- It must support filtering by cluster, region, status, and period

#### RF-NET-03 — Pre-configured Selection Variants
- The dashboard must offer pre-configured quick filters:
  - **Critical:** units with score < 45
  - **Contract Expiring:** contracts expiring within 30 days
  - **Highlights:** units with score ≥ 80

#### RF-NET-04 — Unit Detail (Object Page)
- When a unit is selected, display:
  - Performance KPIs with trend (last 6 months)
  - Compliance status with open alerts
  - Contract status (term, royalty value)
  - Score history with variation over time

#### RF-NET-05 — KPI Ingestion
- The system must accept KPI data via OData API (from POS/ERP systems via Integration Suite)
- Upon receiving new KPIs, the score must be recalculated automatically
- Ingestion failures must be logged and alerted

#### RF-NET-06 — Automatic Alerts
- The system must automatically generate alerts for:
  - Health Score dropping below 45
  - Contract expiring in 90 and 30 days
  - Revenue drop > 10% MoM
  - NPS below 40

---

### 7.2 Module: Governance & Compliance

**Objective:** Automatically detect deviations from the network standard (price, mix, promotion) and manage the notification and correction process.

**Fiori Floorplan:** List Report Object Page (LROP)

#### RF-COMP-01 — Authorized Product Catalog
- The franchisor must be able to manage the authorized product catalog
- For each SKU: name, category, minimum price, maximum price, and suggested price
- The catalog must have a defined validity period (start and end date)
- Changes to the published catalog must immediately reflect in future checks

#### RF-COMP-02 — Automatic Deviation Detection
- Upon receiving sales data (`VendaPraticada`) from a unit, the system must automatically check:
  - **Price Deviation:** price charged outside the catalog range (minimum-maximum)
  - **Mix Deviation:** SKU sold is not in the active catalog
  - **Promotion Deviation:** unauthorized discount applied (future)
- Detection must occur in real time (not in a nightly batch)

#### RF-COMP-03 — Severity Classification
- Deviation severity must be configurable by the franchisor via `RegrasCompliance`
- Price deviation: Low (< medium threshold), Medium (≥ medium threshold), High (≥ high threshold)
- Mix deviation: always High
- Suggested default thresholds: Medium ≥ 5%, High ≥ 15%

#### RF-COMP-04 — Deviation List
- The franchisor must view all deviations in a List Report filterable by:
  - Type (price, mix, promotion), Severity, Status, Unit, Period
- Pre-configured Selection Variants: "High Severity", "Deadline Approaching", "No Response"

#### RF-COMP-05 — Deviation Detail (Object Page)
- The detail of a deviation must show:
  - Comparison: authorized price vs. charged price with deviation percentage
  - History of notifications sent for this unit/SKU
  - Previous deviations of the same SKU at the same unit

#### RF-COMP-06 — Notification to the Franchisee
- High-severity deviations must generate an automatic notification to the franchisee
- The notification must contain: description of the deviation, correction deadline, action guidance
- The correction deadline must be configurable by deviation type in `RegrasCompliance`
- Notifications without a response by the deadline must be escalated to the franchisor manager

#### RF-COMP-07 — Compliance Score Update
- With each new deviation detected or resolved, the unit's compliance percentage must be recalculated
- The `compliancePct` in `Saude_Unidade` must reflect the current state (not the history)

---

### 7.3 Module: Franchisee Portal

**Objective:** Provide the franchisee with a clear view of their own performance, pending actions, and proactive AI-generated recommendations.

**Fiori Floorplan:** Overview Page (OVP) with 5 cards

#### RF-FRAN-01 — Franchisee Dashboard (OVP)
- Upon logging in, the franchisee must see an Overview Page with:
  - **Card 1:** My KPIs — revenue, average ticket, NPS, MoM growth for the latest period
  - **Card 2:** My Position in the Network — score vs. cluster average (anonymized data)
  - **Card 3:** Pending Actions — top 5 most urgent actions across all modules
  - **Card 4:** Recommendations — top 3 recommendations generated by AI Core
  - **Card 5:** Compliance — % compliance and open deviations

#### RF-FRAN-02 — Data Isolation
- The franchisee must see **only** data from their own unit
- The benchmark must show anonymized cluster averages — never individual data from other units
- Isolation must be guaranteed in the backend (CAP `@restrict`), not just in the frontend

#### RF-FRAN-03 — Consolidated Pending Actions
- The system must aggregate the franchisee's pending actions from all modules into a single list:
  - Onboarding tasks (status: Pending, Overdue)
  - Compliance notifications with a deadline
  - Contracts expiring within 30 days
  - Open operational alerts
- The list must be sorted by urgency (deadline and severity)

#### RF-FRAN-04 — AI-Generated Recommendations
- The system must generate personalized recommendations via SAP AI Core + GenAI Hub
- Recommendations must be based on: unit KPIs, compliance deviations, comparison with the cluster benchmark
- Recommendations must be persisted and displayed with explained context (the "why")
- The franchisee must be able to mark them as Applied, Read, or Dismissed
- The generation job must run daily and replace old recommendations of the same type

#### RF-FRAN-05 — Performance Trend
- When navigating from the KPI card, the franchisee must see a line chart with revenue for the last 6 months
- The chart must include the cluster benchmark line for visual comparison

---

### 7.4 Module: Onboarding

**Objective:** Standardize and track the process of opening new units, reducing lead time and manual effort.

**Fiori Floorplan:** List Report Object Page with Fiori Draft

#### RF-ONB-01 — Onboarding Process List
- The franchisor must view all onboarding processes in progress
- Columns: Unit, Franchisee, Current Stage, % Completion, Opening Forecast, Status
- Filters by status, region, owner

#### RF-ONB-02 — Onboarding Process (Object Page with Draft)
- The onboarding process must be editable with Draft enabled (save without submitting)
- The Object Page must show:
  - Header: unit, % completion, status, opening forecast
  - Stages and Tasks section: progress by stage with the status of each task
  - Pending Documents section: documents awaiting submission or approval
  - Open Approvals section: pending approvals with owner

#### RF-ONB-03 — Configurable Stage Template
- The franchisor must be able to configure the onboarding stage template (e.g., Documentation → Construction → Training → Grand Opening)
- The template must be applied to new processes without affecting processes in progress
- Each stage must have configurable order, estimated deadline, and mandatoriness

#### RF-ONB-04 — Document Approval Workflow
- When a document is submitted, an approval workflow must be triggered via Build Process Automation
- If approved: the next task is unlocked
- If rejected: the franchisee is notified with the reason and a deadline for resubmission
- Approvals without a response by the deadline must escalate to the higher-level owner

#### RF-ONB-05 — Franchisee View in Onboarding
- The franchisee in an onboarding process must see their pending tasks in the Franchisee Portal (Pending Actions card)
- Documents to submit, approvals pending, and next stages must be visible

#### RF-ONB-06 — Deadline Alerts
- Tasks with an approaching deadline (3 days before) and overdue tasks must generate an automatic alert
- The alert must go to the task owner and to the process manager at the franchisor

---

## 8. Non-Functional Requirements

### 8.1 Security and Identity

| Requirement | Detail |
|---|---|
| **Authentication** | SAP Identity Authentication Service (IAS) for all users |
| **Authorization** | SAP Authorization & Trust Management (XSUAA) with roles: `Franqueadora_Gestor`, `Franqueado` |
| **Data isolation** | Franchisee accesses only data from their own unit — guaranteed in the backend via CAP `@restrict` |
| **User attributes** | `unidade_ID` and `cluster` as custom attributes in the JWT token (IAS) |
| **Identity propagation** | JWT token propagated to all downstream services |

### 8.2 Performance

| Requirement | Target |
|---|---|
| Loading the Network Dashboard (ALP, 20 units) | < 3 seconds |
| Loading the Franchisee OVP | < 2 seconds |
| Deviation detection after INSERT of VendaPraticada | < 5 seconds |
| Health Score recalculation | < 3 seconds per unit |
| Recommendation generation by AI Core (daily job) | < 60 seconds per unit |

### 8.3 Scalability

| Requirement | Target |
|---|---|
| Units in the network | Support up to 1,000 units without degradation |
| Concurrent users | Up to 200 franchisees connected at the same time |
| KPI volume | 12 months of history per unit (240 records per unit) |
| VendaPraticada volume | Up to 500 SKUs per unit per period |

### 8.4 Availability and Reliability

| Requirement | Target |
|---|---|
| Availability | 99.5% (excluding planned maintenance windows) |
| Data loss | RPO = 1 hour (SAP HANA Cloud with automatic backup) |
| Recovery | RTO = 4 hours |

### 8.5 Usability

| Requirement | Detail |
|---|---|
| **Responsiveness** | All screens must work on mobile devices (browser) |
| **Accessibility** | Compliance with SAP Fiori Design System (WCAG 2.1 AA) |
| **Language** | Portuguese (Brazil) as the default language |
| **Theming** | Network's visual identity applied via SAP UI Theme Designer |

### 8.6 Integrability

| System | Integration type |
|---|---|
| Franchisees' POS | SAP Integration Suite — periodic iFlow (pull) or webhook (push) |
| Franchisor's ERP (S/4HANA) | SAP Integration Suite — master data for products and contracts |
| Legacy systems / spreadsheets | SAP Integration Suite — CSV upload via API |
| SAP AI Core + GenAI Hub | REST via CAP `cds.connect.to('aicore')` |
| SAP Event Mesh | Publication of compliance events and alerts |
| SAP Build Process Automation | Document approval workflows |

---

## 9. User Stories

### Franchisor — Network Dashboard

> **US-NET-01**  
> As a franchisor manager,  
> I want to open the dashboard every Monday and immediately see which stores are in critical alert,  
> so that I can prioritize actions without having to read any report.

> **US-NET-02**  
> As an expansion director,  
> I want to filter stores by cluster and region and see the relative performance among them,  
> so that I can identify patterns and replicable best practices.

> **US-NET-03**  
> As a franchisor manager,  
> I want to click on a store and see the KPI history and compliance alerts,  
> so that I have full context before calling the franchisee.

### Franchisor — Compliance

> **US-COMP-01**  
> As a compliance manager,  
> I want to be alerted automatically when a unit sells outside the price table,  
> so that I don't have to rely on on-site auditors to discover deviations.

> **US-COMP-02**  
> As a compliance manager,  
> I want to see all open deviations filtered by severity,  
> so that I can prioritize critical cases and ensure a response within the deadline.

> **US-COMP-03**  
> As a compliance manager,  
> I want the franchisee to be notified automatically with a correction deadline,  
> so that I don't have to do it manually one by one.

### Franchisee

> **US-FRAN-01**  
> As a franchisee,  
> I want to see my revenue compared with the average of stores in my cluster,  
> so that I understand whether I am above or below what is expected for my store profile.

> **US-FRAN-02**  
> As a franchisee,  
> I want to receive practical recommendations based on my performance,  
> so that I know what to do to improve without having to call headquarters.

> **US-FRAN-03**  
> As a franchisee,  
> I want to see everything that is pending — documents, tasks, notifications — on a single screen,  
> so that I don't miss deadlines due to lack of visibility.

### Onboarding

> **US-ONB-01**  
> As an expansion manager,  
> I want to track the progress of all openings in progress on a single dashboard,  
> so that I know which process is at risk of delay without having to call each franchisee.

> **US-ONB-02**  
> As a franchisee in the opening phase,  
> I want to know exactly what I need to do and when,  
> so that I can open my store on time without depending on emails from headquarters.

> **US-ONB-03**  
> As an expansion manager,  
> I want document approval to be done within the system with a controlled deadline,  
> so that the process does not stall due to a lack of response from an approver.

---

## 10. Out of MVP Scope

The following features are out of scope for the MVP version and will be evaluated for Phase 2:

| Feature | Rationale |
|---|---|
| **Expansion Analysis (market scoring)** | Requires historical performance data by market — available after 12 months of operation |
| **SAP Analytics Cloud** | Additional license; analytics via HANA + Fiori is sufficient for the MVP |
| **SAP Datasphere** | Needed only when there are multiple heterogeneous sources to federate |
| **Native mobile app (MDK)** | No offline-use requirement identified; a responsive PWA is sufficient |
| **Royalties module** | Integration with the existing financial system is a separate project |
| **Multi-tenancy** | Each network will have its own subaccount in the MVP |
| **Franchisee gamification** | Ranking, badges, rewards — outside the initial focus |
| **AI demand forecasting** | Requires accumulated sales history — future |
| **Automated MTA deploy to Work Zone** | For the MVP, registration in Work Zone is done manually; a full MTA is Phase 2 |

---

## 11. Delivery Plan

### Phase 1 — MVP (through August 2026)

| Sprint | Period | Deliverable |
|---|---|---|
| Sprint 1 | 29/07 – 04/08 | CAP backend: schema, services, seed data, local validation |
| Sprint 2 | 05/08 – 11/08 | Fiori: ALP Network Dashboard + LROP Compliance + service handler |
| Sprint 3 | 12/08 – 18/08 | OVP Franchisee Portal + AI Core integration + LROP Onboarding |
| Sprint 4 | 19/08 – 25/08 | Deploy BTP CF + Work Zone + polish + rehearsals |
| **Demo** | **26/08** | **Dragons' Den Presentation** |

### Phase 2 — Expansion (Q4 2026)

| Feature | Priority |
|---|---|
| Expansion Analysis module (market scoring) | High |
| SAP Analytics Cloud for executive KPIs | Medium |
| Automated MTA deploy + CDM Work Zone | High |
| Native integration with S/4HANA (master data) | High |
| Push notifications via SAP Build Work Zone | Medium |
| Multi-tenancy (multiple networks) | Low |

### Phase 3 — Commercial product (2027)

| Feature | Priority |
|---|---|
| SAP Datasphere for data federation | Medium |
| Native mobile app (MDK) | Low |
| Franchisee gamification and ranking | Low |
| AI demand forecasting | Medium |
| Recommendations marketplace (SAP Store) | Low |

---

## 12. Dependencies and Risks

### Technical dependencies

| Dependency | Owner | Status |
|---|---|---|
| BTP subaccount with HANA Cloud, AI Core, Event Mesh, Integration Suite | BTP Team | ✅ Available |
| SAP Build Work Zone instance | BTP Team | To configure |
| SAP IAS configured for the franchisor | BTP Team | To configure |
| POS/ERP data ingestion iFlow | Integration Team | Week 3 |
| Network's visual identity for UI Theme Designer | Client/Design | Post-MVP |

### Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Live demo fails during presentation | Low | High | Test 3x before the day. Plan B: use seed data without Integration Suite |
| Franchisee OVP too complex for the deadline | Medium | Medium | Simplify to LROP if necessary; OVP moves to Phase 2 |
| AI Core returns a slow or invalid response | Medium | Medium | Pre-generated recommendations as fallback; GenAI Hub has a 10s SLA |
| Client's POS data format incompatible | High | Medium | For the demo, use manual CSV upload; productive iFlow is post-MVP |
| XSUAA/IAS misconfigured on demo day | Low | High | Keep mock users active as a fallback for presentation day |

---

## 13. Open Questions

| # | Question | Impact | Owner | Deadline |
|---|---|---|---|---|
| 1 | What is the network's visual identity for the UI Theme Designer? | Low (post-MVP) | Design | Post-August |
| 2 | Does the client have a standardized or heterogeneous POS? | High for production integration | Architecture | Phase 2 |
| 3 | Which LLM model to use in GenAI Hub? (gpt-4o, Claude, Gemini) | Medium — impacts recommendation quality | AI Team | Week 3 |
| 4 | How many SKUs in the real catalog? Impacts detection performance | Medium — above 10k SKUs the query will need optimization | Dev | Week 2 |
| 5 | Will the franchisee have access to multiple units? | High — impacts the JWT authentication model | Architecture | Before deploy |
| 6 | Build Work Zone Standard or Advanced? | Medium — Advanced supports more OVP card types | BTP Team | Week 4 |
| 7 | Who manages the Onboarding stage template? Admins only? | Low — but requires a separate role | Dev | Week 2 |

---

*Document generated in July 2026. Next review planned after MVP delivery (August 2026).*
