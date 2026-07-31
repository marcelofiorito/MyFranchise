# RunMyFranchise

**🇧🇷 Português** · [🇬🇧 English](README.en.md)

> **SAP BTP solution for franchise network management**
> Dragons' Den: Learn to Win Edition 2026 — SAP Solution Advisory

---

## Visão Geral

**Problema:** Franqueadoras enfrentam dificuldade para gerenciar e expandir redes de forma padronizada. Informações ficam descentralizadas, compliance é manual, KPIs chegam com atraso e franqueados operam como ilhas — sem visibilidade da própria performance nem orientação proativa.

**Solução:** Plataforma SAP BTP que conecta franqueadora e franqueados em tempo real: painel da rede, compliance automático, agentes de IA para recomendações e reposição de estoque, e portal do franqueado com dashboard próprio.

**Persona âncora:** Alexandre Mendes — Diretor de Operações, rede de 280 lojas fashion/lifestyle, quer dobrar a rede sem multiplicar o caos.

---

## Contexto da Competição

| Item | Detalhe |
|---|---|
| Evento | Dragons' Den: Learn to Win Edition 2026 |
| Organização | SAP Solution Advisory |
| Formato | 15 min demo ao vivo + 5 min Q&A |
| Data | 26 de agosto de 2026 |
| Requisito crítico | Demo ao vivo, sem screenshots |
| Critério de maior peso | Live Demo Quality (20%) |

---

## Estado do Projeto

**Deployado em produção** — SAP BTP Cloud Foundry, org `sa-build-platform-org / DEV`, região `us10`.

| Componente | Status |
|---|---|
| Backend CAP + HANA Cloud + XSUAA | ✅ Produção |
| AI Core + GenAI Hub (gpt-4o) | ✅ Produção — confirmado `modo: "GenAI Hub"` |
| Painel da Rede (LR + donut + OP) | ✅ Produção |
| Governança & Compliance (LR + OP) | ✅ Produção |
| Onboarding (LR + OP + Draft) | ✅ Produção |
| Portal do Franqueado (OVP — 5 cards) | ✅ Produção |
| Recomendações da IA (LR + OP) | ✅ Produção |
| Estoque & Reposição (LR + OP) | ✅ Produção |
| Agente de Reposição (nível 1-2) | ✅ Produção — pedidos PENDENTE gerados por gpt-4o |
| Navegação LR → Object Page | ✅ Todos os apps (UI5 1.136.7 fixo) |
| Joule (copiloto conversacional) | ⬜ Pendente |
| Agente nível 3 (aprovação via BPA) | ⬜ Pendente |

**Backend:** `https://sa-build-platform-org-dev-myfranchise-srv.cfapps.us10.hana.ondemand.com`

---

## Arquitetura SAP BTP

![Arquitetura RunMyFranchise](arquitetura.png)

```
┌──────────────────────────────────────────────────────────────┐
│ CANAIS DE ACESSO                                             │
│ SAP Build Work Zone (managed approuter) │ Responsivo (PWA)  │
├──────────────────────────────────────────────────────────────┤
│ APPS FIORI (6)                                               │
│ Painel da Rede │ Compliance │ Onboarding │ Estoque           │
│ Recomendações IA │ Portal do Franqueado (OVP)                │
├──────────────────────────────────────────────────────────────┤
│ BACKEND — SAP CAP (Node.js, OData V4)                        │
│ FranqueadoraService │ FranqueadoService                      │
│ Agente de Recomendações (gpt-4o) │ Agente de Reposição       │
│ Middleware de atributos │ Servidor customizado                │
├──────────────────────────────────────────────────────────────┤
│ SERVIÇOS SAP BTP                                             │
│ HANA Cloud (hdi-shared) │ XSUAA │ AI Core + GenAI Hub       │
│ HTML5 Apps Repo (host + runtime) │ Destination Service       │
└──────────────────────────────────────────────────────────────┘
```

### Decisões Técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Frontend | Fiori Elements + Build Work Zone | Annotation-driven, sem app nativo |
| Backend | SAP CAP Node.js, OData V4 | `@sap/cds ^10` |
| Banco de dados | HANA Cloud (prod) / SQLite in-memory (dev) | `@cap-js/hana ^2.8` / `@cap-js/sqlite ^2.1.3` |
| IA | AI Core + GenAI Hub (gpt-4o) | `@sap-ai-sdk/orchestration ^2.13` |
| UI5 runtime | Versão fixa `1.136.7` | Alinha build e runtime; evita comportamento `Active` no FE V4 |
| Perfis CAP | `hana-cloud`/`xsuaa` como default; `[development]` ativa sqlite+mocked | Evita apps vazios em CF |

---

## Módulos (6 apps Fiori)

### 1. Painel da Rede
- **Floorplan:** List Report + Object Page
- **contextPath:** `/Saude_Dashboard` → drill-down `/Unidades`
- **Destaque:** Donut de criticidade (`@Aggregation.ApplySupported` + `Analytics.AggregatedProperty`): Crítico / Atenção / Saudável. Tabela com score colorido por criticality. Filtro por cluster/região. Navegação para Object Page da unidade.

### 2. Governança & Compliance
- **Floorplan:** List Report + Object Page
- **contextPath:** `/Desvios`
- **Destaque:** Detecção automática de desvios no `after CREATE VendaPraticada`. Regras configuráveis (`RegrasCompliance`). Severidade colorida (ALTA vermelho, MÉDIA amarelo). Navegação para detalhe do desvio.

### 3. Onboarding
- **Floorplan:** List Report + Object Page + `@odata.draft.enabled`
- **contextPath:** `/ProcessosOnboarding`
- **Destaque:** Acompanhamento de ponta a ponta da abertura de novas lojas. A lista mostra todos os processos em andamento com status e percentual de conclusão. Ao clicar num processo, o gestor vê as **etapas e tarefas** daquele onboarding — com responsável, prazo, status e documentos. O draft salva o progresso automaticamente; nada se perde se a tela for fechada. Seed incluído com lojas em estágio de onboarding (u301, u302, u303).

### 4. Estoque & Reposição
- **Floorplan:** List Report + Object Page
- **contextPath:** `/Estoque_Unidade`
- **Destaque:** Cobertura de estoque calculada com **sazonalidade regional** (ex.: Havaianas em julho: NE fator 1,8 = RUPTURA; Sul fator 0,4 = OK). Filtro por região mostra o contraste Sul×Nordeste. `coberturaDias` e `estoqueCriticality` computados no handler considerando `Sazonalidade_Regional` e `Calendario_Promocional`. Object Page com situação + localização.

### 5. Recomendações da IA
- **Floorplan:** List Report + Object Page
- **contextPath:** `/MinhasRecomendacoes`
- **Destaque:** Lista recomendações com prioridade colorida (ALTA vermelho). Object Page mostra a **descrição completa gerada pelo gpt-4o** — SKUs, percentuais, impacto, ação com prazo — sem truncar.

### 6. Portal do Franqueado
- **Floorplan:** Overview Page (OVP) — 5 cards (`sap.ovp.app.Component`)
- **Cards:** Minha Performance (faturamento 6 meses em BRL, período "Jun/2026"), Score de Saúde (criticality colorido), Ações Pendentes (desvios com ícones), Recomendações da IA (gpt-4o), Posição na Rede (benchmark do cluster)
- **Destaque:** Subtítulo "Loja Porto Alegre" em cada card. Criticality via `DataFieldForAnnotation→DataPoint`. Currency `BRL`. Middleware de fallback de atributos JWT (IAS não envia `unidade_ID`/`cluster`).

---

## Agentes de IA

### Agente de Recomendações (`srv/ai/recommendations-job.js`)
- **LLM:** gpt-4o via `@sap-ai-sdk/orchestration` (GenAI Hub)
- **Input:** KPIs, benchmark do cluster, desvios de compliance abertos
- **Output:** 3 recomendações priorizadas (ALTA/MÉDIA/BAIXA) com descrição rica
- **Fallback:** regras determinísticas (desvio de preço → PRECIFICACAO; queda de faturamento → CAMPANHA; NPS baixo → TREINAMENTO)
- **Actions:** `gerarRecomendacoes(unidade_ID)`, `gerarRecomendacoesTodas()`

### Agente de Reposição (`srv/ai/reposicao-agent.js`)
- **LLM:** gpt-4o via GenAI Hub (mesmo padrão)
- **Input:** saldo de estoque, giro médio, lead time, fator sazonal regional, uplift promocional
- **Output:** `Pedidos_Reposicao` em status **PENDENTE** — quantidade calculada (giro × lead time × fator sazonal), fornecedor sugerido, justificativa detalhada
- **Lógica sazonal:** `coberturaDias = saldoAtual / (giroMedioDiario × fatorSazonal × upliftPromo)`. Ruptura quando `coberturaDias < leadTimeDias`.
- **Actions:** `gerarReposicao(unidade_ID)`, `gerarReposicaoTodas()`
- **Nível:** 1-2 (detecta + propõe). Nível 3 (aprovação via BPA) = próximo passo.

---

## Caso de Foco — Ruptura de Estoque

Ruptura de estoque é um dos principais riscos operacionais em redes de franquias: falta de produto gera venda perdida, insatisfação do franqueado e dano à marca. O diferencial está em **antecipar** a ruptura considerando sazonalidade regional — a mesma estratégia de reposição não serve para todas as regiões.

**Demonstração com dados reais (julho — mês de referência):**

| Loja | Região | SKU | Cobertura (jul) | Status |
|---|---|---|---|---|
| Recife (u178) | NE | Havaianas Top | 2,6 dias | 🔴 RUPTURA |
| Salvador (u156) | NE | Havaianas Top | 1,8 dias | 🔴 RUPTURA |
| Porto Alegre (u147) | S | Havaianas Top | 66,7 dias | 🟢 OK |
| Porto Alegre (u147) | S | Bota Couro Inverno | 1,8 dias | 🔴 RUPTURA |

Mesmo produto, mesmo mês → risco oposto por região. O agente calcula cobertura com fator sazonal regional e gera pedidos de reposição com justificativa do gpt-4o, considerando também o calendário de promoções.

> **Cenário da demo:** o caso de ruptura de estoque é o foco principal da demonstração de 26/08. Outros cenários (compliance, onboarding, recomendações IA) poderão ser incluídos conforme análise do time.

---

## Cenário de Demo — Loja 147 (Porto Alegre)

**Dados validados em produção:**

| Dado | Valor |
|---|---|
| Score de Saúde | **32 / 100** — crítico (vermelho) |
| Compliance | 45% |
| Faturamento Jun/2026 | R$ 162.378 (queda de R$ 199k em fev → R$ 162k em jun) |
| Desvios detectados | 4 (Tênis Casual −14,3% ALTA, Boné −24,1% ALTA, Vestido −8,8% MÉDIA, Short não-autorizado) |
| Recomendações IA | 3 — via gpt-4o (`modo: "GenAI Hub"` confirmado) |
| Donut da rede | 4 críticas / 9 atenção / 7 saudáveis (20 unidades) |

**Roteiro de demo:** ver `teste/ROTEIRO_DEMO.md` (4 atos: Visão → Causa → IA → Ponta)

---

## Tech Stack

```
@sap/cds                   ^10.0.5     # CAP backend (OData V4)
@cap-js/sqlite             ^2.1.3      # SQLite em memória (dev)
@cap-js/hana               ^2.8.0      # HANA Cloud (prod)
@sap-ai-sdk/orchestration  ^2.13.0     # GenAI Hub — gpt-4o
@sap/xssec                 ^4.13.3     # autorização XSUAA
express                    ^4.22.2     # runtime HTTP

SAP HANA Cloud                         # banco de dados em produção
SAP Build Work Zone                    # portal e launchpad (managed approuter)
SAP AI Core + GenAI Hub               # agentes de IA (gpt-4o)
SAP IAS + XSUAA                       # identidade e autorização
SAPUI5 1.136.7                        # runtime Fiori Elements (versão fixada)
```

**Perfis CAP:** `hana-cloud`/`xsuaa` como **default**; `[development]` ativa sqlite+mocked automaticamente com `cds watch`.

---

## Estrutura do Projeto

```
MyFranchise/
├── db/
│   ├── schema.cds              # Modelo de dados (todos os módulos)
│   └── data/                   # 43 arquivos CSV de seed
│       ├── myfranchise-Franqueados.csv        (8 franqueados)
│       ├── myfranchise-Unidades.csv           (20 unidades + 3 onboarding)
│       ├── myfranchise-KPI_Unidade.csv        (120 KPIs — 20×6 meses)
│       ├── myfranchise-Saude_Unidade.csv      (20 scores)
│       ├── myfranchise-Desvios.csv            (7 desvios — Loja 147)
│       ├── myfranchise-Estoque_Unidade.csv    (13 SKUs com cobertura sazonal)
│       ├── myfranchise-Sazonalidade_Regional.csv (13 fatores NE/S/SE/CO/N)
│       ├── myfranchise-Calendario_Promocional.csv
│       ├── myfranchise-ProcessosOnboarding.csv / Etapas / Tarefas
│       └── ... (code lists e demais entidades)
├── srv/
│   ├── service.cds             # FranqueadoraService + FranqueadoService
│   ├── service.js              # Handlers: detecção de desvios, recálculo score
│   ├── franqueado-service.js   # Impl FranqueadoService: enriquecimento MeuEstoque
│   ├── server.js               # Middleware: fallback atributos JWT do Franqueado
│   └── ai/
│       ├── recommendations-job.js   # Agente de recomendações (gpt-4o + fallback)
│       └── reposicao-agent.js       # Agente de reposição sazonal (gpt-4o + fallback)
├── app/
│   ├── network/          # Painel da Rede (LR + donut + OP)
│   ├── compliance/       # Governança & Compliance (LR + OP)
│   ├── onboarding/       # Onboarding (LR + OP×2 + Draft)
│   ├── inventory/        # Estoque & Reposição (LR + OP)
│   ├── recommendations/  # Recomendações da IA (LR + OP)
│   └── franchisee/       # Portal do Franqueado (OVP — 5 cards)
├── teste/
│   └── ROTEIRO_DEMO.md         # Roteiro 4 atos, checklist, plano B
├── mta.yaml                    # Deploy CF (10 módulos, 6 serviços)
├── xs-security.json            # XSUAA (roles, scopes, atributos)
├── package.json
└── README.md
```

---

## Executar Localmente

### Pré-requisitos
```bash
npm install -g @sap/cds-dk
```

### Iniciar
```bash
npm install
cds watch
```
Acesse **http://localhost:4004**

### Usuários de teste

| Usuário | Senha | Role | Serviço |
|---|---|---|---|
| `gestor` | `gestor` | Franqueadora_Gestor | `/franqueadora` |
| `roberto` | `roberto` | Franqueado (Loja 147 / cluster STD) | `/franqueado` |

### Endpoints úteis
```bash
# Painel — todas as unidades com cobertura sazonal
GET /franqueadora/Estoque_Unidade?$filter=sku eq 'SKU-100'

# Desvios da Loja 147
GET /franqueadora/Desvios?$filter=unidade_ID eq 'u147'

# KPIs jan–jun (Loja 147)
GET /franqueadora/KPI_Unidade?$filter=unidade_ID eq 'u147'&$orderby=periodo

# Agente de recomendações (gpt-4o)
POST /franqueadora/gerarRecomendacoes   { "unidade_ID": "u147" }

# Agente de reposição (gpt-4o, com sazonalidade)
POST /franqueadora/gerarReposicao       { "unidade_ID": "u178" }

# Portal do franqueado
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

O `mta.yaml` publica 10 módulos: `myfranchise-srv`, `db-deployer`, 6 apps HTML5, `appcontent`, `destinationcontent`. Serviços: HANA (hdi-shared), XSUAA, HTML5 Repo (host + runtime), Destination, AI Core (existing `default_aicore`).

**Após cada deploy do appcontent:** remover e re-adicionar os apps no Content Manager do Work Zone para limpar o cache (o site não recarrega automaticamente).

### Work Zone — tiles

| App | `semanticObject` | `action` | Role |
|---|---|---|---|
| Painel da Rede | `NetworkPanel` | `display` | Franqueadora_Gestor |
| Governança & Compliance | `Compliance` | `manage` | Franqueadora_Gestor |
| Onboarding | `Onboarding` | `manage` | Franqueadora_Gestor |
| Estoque & Reposição | `Inventory` | `manage` | Franqueadora_Gestor |
| Recomendações da IA | `Recommendations` | `display` | Franqueado |
| Portal do Franqueado | `FranchiseePortal` | `display` | Franqueado |

---

## Notas de Produção

- **Atributos JWT do Franqueado:** o IdP (IAS) não envia `unidade_ID`/`cluster` na asserção. `srv/server.js` injeta o default `u147`/`STD` via middleware CAP. Para produção real, mapear via IAS assertion attributes.
- **Cold start HANA/AI Core:** fazer 1 request de aquecimento antes da demo (HANA e AI Core têm cold start de segundos).
- **Navegação LR→OP:** requer `contextPath` (não `entitySet`) + `navigation` explícito + `ResponsiveTable` no manifest, e UI5 runtime **versão fixa** (não `/resources/latest`). A versão `1.136.7` foi validada.

---

## Caso de Foco — Ruptura + Joule + Agente (próximos passos)

Escopo confirmado para a demo de 26/08:

### Implementado
- ✅ Modelo (`Estoque_Unidade`, `Sazonalidade_Regional`, `Calendario_Promocional`, `Pedidos_Reposicao`)
- ✅ Sazonalidade regional (fator de demanda por categoria × região × mês)
- ✅ Cálculo de cobertura sazonal no handler
- ✅ Agente de reposição nível 1-2 (detecta risco + gera pedidos PENDENTE via gpt-4o)
- ✅ App Estoque & Reposição com filtro por região (demonstra Havaianas NE×Sul)

### Pendente
- ⬜ **Joule** — registrar entidades como skills para verificações conversacionais ("vou ter ruptura de Havaianas no NE em julho?")
- ⬜ **Agente nível 3** — enviar `Pedidos_Reposicao` APROVADO para processamento via SAP Build Process Automation (human-in-the-loop)
- ⬜ **BPMN completo** — fluxo da detecção ao reabastecimento

---

## Roadmap (pós-demo)

### Inteligência e Automação
- **Joule** — copiloto conversacional sobre os dados da rede ("quais lojas têm risco de ruptura hoje?")
- **Agente de Reposição nível 3** — aprovação automática via SAP Build Process Automation (human-in-the-loop); hoje os pedidos ficam em PENDENTE
- **SAP Build Process Automation** — workflows de aprovação para compliance, reposição e onboarding
- **SAP Analytics Cloud** — dashboards executivos para conselho e diretoria (hoje: Fiori Elements)

### Integração com Sistemas Retail SAP
- **SAP S/4HANA Retail** — integração com gestão de merchandise e pedidos de reposição automáticos
- **SAP Customer Activity Repository (CAR)** — dados reais de vendas no PDV para substituir o seed CSV; demanda em tempo real alimenta o agente de reposição
- **SAP Omnichannel Point-of-Sale (POS DM)** — captura de transações das lojas em tempo real; base para detecção de desvios de preço e ruptura
- **SAP Ariba** — gestão de fornecedores e pedidos de compra para fechar o ciclo de reposição
- **SAP Integrated Business Planning (IBP)** — previsão de demanda com sazonalidade regional para alimentar o agente
- **SAP Emarsys** — campanhas de marketing direcionadas por cluster/região, integradas ao calendário promocional

### Dados e Plataforma
- **SAP Datasphere** — federação de dados de múltiplas fontes (PDV, ERP, e-commerce)
- **Módulo de Expansão** — score de praças para abertura de novas lojas
- **IAS Assertion Attributes** — mapear `unidade_ID`/`cluster` via IdP (remover middleware de fallback)
- **HANA Sequences** — substituir lógica de código de unidade por sequence nativa

---

## Referências

- [CAP Documentation](https://cap.cloud.sap/docs/)
- [SAP Fiori Elements — Feature Showcase](https://github.com/SAP-samples/fiori-elements-feature-showcase)
- [cap-sflight (referência para ALP/chart)](https://github.com/SAP-samples/cap-sflight)
- [cap-cert-petrobras (referência para navegação LR→OP)](https://github.com/marcelofiorito/cap-cert-petrobras)
- [SAP Build Work Zone](https://help.sap.com/docs/build-work-zone-standard-edition)
- [SAP AI Core + GenAI Hub](https://help.sap.com/docs/sap-ai-core)
- [OData Annotation Vocabulary](https://ui5.sap.com/#/topic/030faebe70b34198b17a93b4c6e7b4d7)
