# RunMyFranchise

> **SAP BTP solution for franchise network management**  
> Dragons' Den: Learn to Win Edition 2026 — SAP Solution Advisory

---

## Visão Geral

**Problema:** Franqueadoras enfrentam desafios para gerenciar e expandir redes de forma padronizada e escalável. Informações ficam descentralizadas, processos variam entre unidades e há dificuldade em acompanhar a execução das estratégias, a conformidade da operação e a evolução da performance dos franqueados.

**Solução:** Centralizar a gestão da rede de franquias em uma única plataforma SAP BTP, conectando franqueadora e franqueados para padronizar processos, fortalecer a governança, acompanhar KPIs e apoiar a tomada de decisão.

**Persona âncora:** Alexandre Mendes — Diretor de Operações e Expansão, rede de 280 lojas, segmento fashion/lifestyle. Quer dobrar a rede em 3 anos sem multiplicar o caos operacional.

---

## Contexto da Competição

| Item | Detalhe |
|---|---|
| Evento | Dragons' Den: Learn to Win Edition 2026 |
| Organização | SAP Solution Advisory |
| Formato | 15 min apresentação + 5 min Q&A |
| Data | 26 de agosto de 2026 (tentativo) |
| Requisito crítico | Demo ao vivo, sem screenshots |
| Time | BTP SA + Data & AI SA + Industry Advisor |

### Critérios de julgamento

| Critério | Peso |
|---|---|
| Live Demo Quality | 20% |
| Business Outcomes | 20% |
| Customer Understanding | 15% |
| Innovation | 15% |
| Storytelling | 15% |
| Team Collaboration | 10% |
| Executive Presence | 5% |

---

## Valor de Negócio

| Antes | Depois |
|---|---|
| Visibilidade fragmentada, D+2 em Excel | Painel único, tempo real |
| Compliance verificado por auditoria presencial | Desvios detectados automaticamente |
| Onboarding artesanal, meses de lead time | Fluxo padronizado na plataforma |
| Franqueado sem orientação, alto volume de suporte | Dashboard próprio com recomendações AI |
| Expansão baseada em intuição | Decisão baseada em dados de performance |

---

## Arquitetura SAP BTP

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

### Decisões de Arquitetura

| Decisão | Escolha | Rationale |
|---|---|---|
| Frontend Franqueadora | Fiori Elements + Build Work Zone | Annotation-driven, entrega rápida |
| Frontend Franqueado | Fiori Elements + Build Work Zone | Mesmo stack, sem app nativo |
| Theming | SAP UI Theme Designer | Desacoplado da identidade visual (a definir) |
| Mobile | Responsivo via browser (PWA) | Sem requisito de offline identificado |
| Backend runtime | Cloud Foundry | Mais maduro para MVP |
| Analytics MVP | HANA + Fiori | Sem licença adicional |
| Analytics Fase 2 | SAP Analytics Cloud | Para storytelling executivo e expansão |
| SAP Datasphere | Fora do MVP | Citado na arquitetura como evolução |

---

## Módulos (5 apps Fiori)

### 1. Painel da Rede
- **Floorplan:** List Report + Object Page, com **gráfico donut** de distribuição de criticidade
- **Entidades:** `Saude_Unidade`, `Saude_Dashboard` (view agregável), `KPI_Unidade`, `Alertas`, `Benchmark_Cluster`
- **Destaque:** Score de Saúde ponderado (40% performance + 40% compliance + 20% contrato). O donut agrega por criticidade (`@Aggregation.ApplySupported` + `Analytics.AggregatedProperty`); a tabela mostra o score com criticality colorido (vermelho <45). Selection Variants: "Críticas", "Atenção", "Destaques"
- **Serviços BTP:** CAP · HANA Cloud

### 2. Governança & Compliance
- **Floorplan:** List Report Object Page (LROP)
- **Entidades:** `Catalogos`, `ItensCatalogo`, `VendaPraticada`, `Desvios`, `RegrasCompliance`, `NotificacoesCompliance`
- **Destaque:** Detecção automática de desvios no `after CREATE VendaPraticada`. Regras configuráveis sem alterar código. Loja 147 (Porto Alegre) — cenário da demo com 4 desvios
- **Serviços BTP:** CAP · HANA Cloud

### 3. Portal do Franqueado
- **Floorplan:** Overview Page (OVP) — 5 cards (`sap.ovp.app.Component`)
- **Entidades:** `MeusKPIs`, `MinhaSaude`, `BenchmarkMeuCluster`, `MeusDesvios`, `MinhasRecomendacoes`
- **Destaque:** Isolamento de dados via `@restrict` + atributos do usuário (`$user.unidade_ID` / `$user.cluster`). Cards com nome da loja no subtítulo, criticality colorido (via `DataFieldForAnnotation` → `DataPoint`), currency **BRL** (`@Measures.ISOCurrency`) e período formatado ("Jun/2026"). Cards V4 disponíveis: `list` / `table` (charts exigiriam OData V2)
- **Serviços BTP:** CAP · HANA Cloud · AI Core + GenAI Hub

### 4. Onboarding
- **Floorplan:** List Report Object Page + Fiori Draft
- **Entidades:** `ProcessosOnboarding`, `EtapasOnboarding`, `TarefasOnboarding`, `DocumentosOnboarding`, `AprovacoesOnboarding`
- **Destaque:** `@odata.draft.enabled` salva progresso automaticamente. Seed de processos/etapas/tarefas incluído
- **Serviços BTP:** CAP · HANA Cloud

### 5. Recomendações da IA
- **Floorplan:** List Report + Object Page (padrão do Compliance)
- **Entidade:** `MinhasRecomendacoes` (via `FranqueadoService`)
- **Destaque:** Lista as recomendações do franqueado com prioridade colorida; ao clicar, a **Object Page mostra a descrição completa gerada pelo gpt-4o** (SKUs, percentuais, impacto, ação com prazo) — sem truncar. Alinhado ao padrão Fiori: OVP é ponto de entrada, a leitura acontece na tela de detalhe
- **Serviços BTP:** CAP · HANA Cloud · AI Core + GenAI Hub

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

> **Perfis CAP (importante):** produção usa `hana-cloud` + `xsuaa` como **default**; `[development]` ativa `sqlite` + `mocked`. `cds watch` ativa `[development]` automaticamente. (Inverter isso causa apps vazios em produção — ver histórico de deploy.)

---

## Estrutura do Projeto

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
│   ├── ROTEIRO_DEMO.md              # Roteiro de demo (4 atos, checklist, plano B)
│   └── AVALIACAO_RUPTURA_ESTOQUE.md # Avaliação da proposta de ruptura de estoque
├── mta.yaml                    # Deploy Cloud Foundry (srv + db + 5 apps + Work Zone)
├── xs-security.json            # XSUAA (roles, scopes, atributos)
├── package.json
├── .cdsrc.json
└── README.md
```

---

## Cenário de Demo — Loja 147

A demo ao vivo de 15 minutos usa a **Loja Porto Alegre (código 147)** como unidade em alerta crítico.

| Dado | Valor |
|---|---|
| Score de Saúde | **32 / 100** (crítico — vermelho na tabela do Painel) |
| Compliance | 45% |
| Alertas Alta Severidade | 3 |
| Faturamento Jun/2026 | R$ 162.378 (-13,5% vs. média do cluster STD) |
| NPS | 41,1 (média do cluster: 58) |

**Desvios detectados automaticamente:**

| SKU | Produto | Preço Autorizado | Preço Praticado | Desvio | Severidade |
|---|---|---|---|---|---|
| SKU-004 | Tênis Casual | R$ 315,00 | R$ 269,90 | -14,3% | Alta |
| SKU-011 | Boné Aba Curva | R$ 79,00 | R$ 60,00 | -24,1% | Alta |
| SKU-003 | Vestido Midi | R$ 269,00 | R$ 229,90 | -8,8% | Média |
| SKU-999 | Short Genérico Sem Marca | — | R$ 49,90 | Mix | Alta |

**Recomendações AI geradas (via gpt-4o / GenAI Hub):**
1. `[ALTA]` Corrigir precificação do Tênis Casual e Boné Aba Curva
2. `[MÉDIA]` Ajuste de mix / reposição prioritária
3. `[MÉDIA]` Capacitação em gestão de preços

> As recomendações são geradas em tempo real pelo **gpt-4o** rodando no AI Core (modo "GenAI Hub"), com **fallback por regras** caso o AI Core esteja indisponível. O texto completo (SKUs, percentuais, impacto, ação com prazo) é lido no app **Recomendações da IA**.

**Distribuição da rede no donut do Painel da Rede:**
- 🟢 Verde (score ≥70): 7 unidades
- 🟡 Amarelo (45–69): 9 unidades
- 🔴 Vermelho (<45): 4 unidades (incluindo Loja 147)

---

## Executar Localmente

### Pré-requisitos

```bash
npm install -g @sap/cds-dk   # CDS CLI (instalar uma vez)
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
| `roberto` | `roberto` | Franqueado (Loja 147, cluster STD) | `/franqueado` |

### Endpoints de referência

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

## Estado do Projeto

**Deployado e funcionando em produção** no SAP BTP (Cloud Foundry · `sa-build-platform-org / DEV` · região `us10`).

| Módulo | Status |
|---|---|
| Backend CAP + HANA Cloud + XSUAA | ✅ Em produção |
| Painel da Rede (donut + tabela) | ✅ Em produção |
| Governança & Compliance | ✅ Em produção |
| Portal do Franqueado (5 cards) | ✅ Em produção |
| Onboarding | ✅ Em produção |
| Recomendações da IA (LR+OP) | ✅ Em produção |
| AI-first gpt-4o (GenAI Hub) | ✅ Confirmado (`modo: "GenAI Hub"`) |

**Backend:** `https://sa-build-platform-org-dev-myfranchise-srv.cfapps.us10.hana.ondemand.com` (`/health` → UP; OData protegido por XSUAA).

### Cronograma — Dragons' Den 2026

| Semana | Período | Foco | Status |
|---|---|---|---|
| 1 | 29/07 – 04/08 | Backend + dados mock | ✅ |
| 2 | 05/08 – 11/08 | Fiori annotations (LR + Object Page + LROP) | ✅ |
| 3 | 12/08 – 18/08 | OVP + GenAI Hub integration | ✅ |
| 4 | 19/08 – 25/08 | Polish + Work Zone + deploy + ensaios | 🔄 Deploy feito; ensaios pendentes |
| **D** | **26/08** | **Apresentação** | 🎯 |

### Pendências
- Ensaios da demo ao vivo (ver `teste/ROTEIRO_DEMO.md`)
- Adicionar o app **Recomendações da IA** ao site do Work Zone (app novo)
- Avaliar com o time a proposta de **ruptura de estoque** (ver `teste/AVALIACAO_RUPTURA_ESTOQUE.md`)

---

## Deploy (Cloud Foundry)

```bash
mbt build                                          # gera mta_archives/myfranchise_1.0.0.mtar
cf deploy mta_archives/myfranchise_1.0.0.mtar -f   # publica srv + db + 5 apps + Work Zone
```

O `mta.yaml` publica: `myfranchise-srv` (CAP), `db-deployer` (HANA HDI), os 5 apps HTML5 no html5-repo, destinations e content do Work Zone. AI Core via `existing-service` (`default_aicore`).

## Work Zone — Deploy Manual (Semana 4)

Os `manifest.json` de cada app já contêm as configurações necessárias:

| App | `semanticObject` | `action` | Ícone |
|---|---|---|---|
| Painel da Rede | `NetworkPanel` | `display` | `org-chart` |
| Governança & Compliance | `Compliance` | `manage` | `alert` |
| Portal do Franqueado | `FranchiseePortal` | `display` | `home` |
| Onboarding | `Onboarding` | `manage` | `stage` |
| Recomendações da IA | `Recommendations` | `display` | `ai` |

Todos compartilham `sap.cloud.service: "myfranchise.service"` — o Work Zone agrupa os tiles automaticamente.

**Passos para registrar no Work Zone após o deploy:**
1. Work Zone Cockpit → Content Manager → Content Explorer
2. HTML5 Apps → selecionar os apps
3. Adicionar ao Business Site → arrastar tiles para o layout
4. Atribuir roles (`Franqueadora_Gestor`, `Franqueado`) ao site

> **Nota (cache do Work Zone):** ao mudar o `manifest.json`/annotations de um app e redeployar, é preciso **remover e re-adicionar** o app no Content Explorer — o Work Zone cacheia o conteúdo ao adicioná-lo ao site.

> **Nota (atributos do Franqueado):** o IdP (IAS) não envia `unidade_ID`/`cluster` na asserção e o Cockpit não permite valor estático. Um middleware CAP (`srv/server.js`) injeta o default (`u147`/`STD`) para quem tem a role Franqueado. Em produção real, mapear via IAS assertion attributes.

---

## Fase 2 (pós-competição)

- **Gestão de ruptura de estoque** — detecção proativa de risco de ruptura (cobertura, giro, lead time), com sazonalidade regional e IA recomendando reposição (proposta em avaliação — ver `teste/AVALIACAO_RUPTURA_ESTOQUE.md`)
- Módulo **Análise de Expansão** — score de praças + extensão de mapa (Flexible Programming Model)
- **SAP Analytics Cloud** — dashboards executivos para conselho
- **SAP Datasphere** — federação de dados de múltiplas fontes
- **SAP Build Process Automation** — workflows de aprovação (compliance / onboarding)
- **SAP Event Mesh** — alertas em tempo real
- **Mobile Development Kit (MDK)** — se surgir requisito de offline

---

## Referências

- [CAP Documentation](https://cap.cloud.sap/docs/)
- [SAP Fiori Elements Feature Showcase](https://github.com/SAP-samples/fiori-elements-feature-showcase)
- [OData Annotation Vocabulary](https://ui5.sap.com/#/topic/030faebe70b34198b17a93b4c6e7b4d7)
- [SAP Build Work Zone](https://help.sap.com/docs/build-work-zone-standard-edition)
- [SAP AI Core + GenAI Hub](https://help.sap.com/docs/sap-ai-core)
