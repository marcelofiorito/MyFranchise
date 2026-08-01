# Changelog — RunMyFranchise

Todas as mudanças relevantes do projeto são documentadas aqui.  
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.0.0] — 2026-08-01 · Produção

### Módulos em Produção
- **Painel da Rede** — ALP com donut de criticidade, score por cluster, drill-down para Object Page de unidade
- **Governança & Compliance** — Detecção automática de desvios após `CREATE VendaPraticada`; severidade colorida
- **Onboarding** — LROP + Object Page com draft habilitado; acompanhamento de etapas, tarefas e documentos
- **Estoque & Reposição** — Cobertura calculada com sazonalidade regional; aba Pedidos de Reposição no Object Page
- **Pedidos de Reposição** — App dedicado com bound actions Aprovar/Recusar; filtros por status, região e origem
- **Recomendações da IA** — Recomendações geradas pelo gpt-4o via SAP GenAI Hub; prioridade colorida
- **Portal do Franqueado** — OVP com 5 cards; isolamento total de dados via `@restrict where: unidade_ID`
- **Admin (controle da demo)** — App UI5 customizado com reset, simulação de recebimento e geração de IA

### Agentes de IA
- **Agente de Reposição** (`srv/ai/reposicao-agent.js`) — Nível 1-2: detecta ruptura com sazonalidade regional + gera pedidos com justificativa gpt-4o. Fallback determinístico para dev/offline
- **Agente de Recomendações** (`srv/ai/recommendations-job.js`) — 3 recomendações priorizadas por unidade via gpt-4o. Fallback por regras (desvio → PRECIFICACAO, queda → CAMPANHA, NPS → TREINAMENTO)

### Joule (MCP Server)
- **MCP Server** deployado no Cloud Foundry (`joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com`)
- **7 tools:** `get_lojas_em_risco`, `get_cobertura_estoque`, `get_pedidos_pendentes`, `get_recomendacoes`, `get_score_rede`, `aprovar_pedido`, `recusar_pedido`
- Fluxo end-to-end validado: aprovação de 6 pedidos por linguagem natural

### Infraestrutura
- Deploy MTA no BTP Cloud Foundry (org `sa-build-platform-org / DEV`, região `us10`)
- SAPUI5 fixado em `1.136.7` (alinha build e runtime; evita comportamento `Active` no FE V4)
- KPI tiles dinâmicos no launchpad: ruptura + pedidos pendentes (refresh 30s via `rupturaCount` + `pedidosPendentesCount`)
- CSRF token automático no MCP Server para POSTs no OData V4 CAP

---

## [0.8.0] — 2026-07-25 · Pré-produção

### Adicionado
- `app/replenishment/` — app dedicado para Pedidos de Reposição com Aprovar/Recusar
- Bound actions `aprovar` e `recusar` em `Pedidos_Reposicao`
- `app/admin/` — painel de controle da demo (UI5 customizado)
- Unbound actions de demo: `resetarDemo`, `simularRecebimento`
- Unbound actions de KPI: `rupturaCount`, `pedidosPendentesCount`

---

## [0.6.0] — 2026-07-18 · Beta

### Adicionado
- `srv/ai/reposicao-agent.js` — Agente de Reposição com sazonalidade regional e integração gpt-4o
- `app/inventory/` — app Estoque & Reposição com cobertura sazonal
- Entidades `Sazonalidade_Regional` e `Calendario_Promocional` no modelo de dados
- Fórmula: `coberturaDias = saldoAtual / (giroMedioDiario × fatorSazonal × upliftPromo)`
- `app/recommendations/` — app Recomendações da IA

---

## [0.4.0] — 2026-07-11 · Alpha

### Adicionado
- `srv/ai/recommendations-job.js` — Agente de Recomendações com GenAI Hub + fallback determinístico
- `srv/service.js` — handlers completos: detecção de desvios, recalcular score de saúde, ações de IA
- Score de saúde: `(performancePct × 0.40) + (compliancePct × 0.40) + (scoreContrato × 0.20)`
- `app/franchisee/` — Portal do Franqueado (OVP com 5 cards)
- `app/onboarding/` — Onboarding com draft habilitado

---

## [0.2.0] — 2026-07-04 · Scaffold

### Adicionado
- `db/schema.cds` — modelo de dados completo (Franqueados, Unidades, KPI, Saúde, Compliance, Estoque, Onboarding, Recomendações, Contratos)
- `srv/service.cds` — FranqueadoraService + FranqueadoService com `@restrict` instance-based auth
- `app/network/` — Painel da Rede (ALP + Object Page)
- `app/compliance/` — Governança & Compliance (LROP)
- Seed data: 43+ CSVs cobrindo 20 unidades, 120 KPIs, 13 SKUs com sazonalidade
- `xs-security.json` — roles: `Franqueadora_Gestor`, `Franqueado`

---

## [0.1.0] — 2026-06-27 · Kickoff

### Adicionado
- Estrutura inicial do projeto CAP (`cds init`)
- `package.json` com perfis dev (sqlite+mocked) e produção (hana+xsuaa)
- `mta.yaml` com serviços HANA Cloud, XSUAA, AI Core, Destination
- Documentação inicial: PRD.md, SPEC.md, Integração.md

---

## Roadmap Pós-demo

### [1.1.0] — Previsto pós-26/08
- **Agente nível 3** — aprovação automática via SAP Build Process Automation (BPA)
- **Joule Capability A2A** — registrar o MCP Server como Joule Capability nativa no Work Zone
- **SAP Analytics Cloud** — dashboards executivos da rede (Fase 2 da arquitetura)
- **SAP Datasphere** — federação de dados para enriquecer contexto dos agentes com dados do S/4HANA + CAR
- **Integração S/4HANA** — Event Mesh para movimentações de estoque; Integration Suite para criação de PO no Ariba
