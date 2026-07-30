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
├─────────────────────────────────────────────────────────────────┤
│ SERVIÇOS SAP BTP                                                │
│ SAP CAP │ Build Process Automation │ AI Core + GenAI Hub       │
│ Integration Suite │ Event Mesh                                  │
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

## Módulos do MVP

### 1. Painel da Rede
- **Floorplan:** Analytical List Page (ALP)
- **Entidades:** `Saude_Unidade`, `KPI_Unidade`, `Alertas`, `Benchmark_Cluster`
- **Destaque:** Score de Saúde ponderado (40% performance + 40% compliance + 20% contrato). Selection Variants: "Críticas", "Vencendo Contrato", "Destaques"
- **Serviços BTP:** CAP · HANA Cloud · Event Mesh

### 2. Governança & Compliance
- **Floorplan:** List Report Object Page (LROP)
- **Entidades:** `Catalogo`, `ItemCatalogo`, `VendaPraticada`, `Desvios`, `RegrasCompliance`, `NotificacoesCompliance`
- **Destaque:** Detecção automática de desvios no `after CREATE VendaPraticada`. Regras configuráveis sem alterar código. Loja 147 (Porto Alegre) — cenário da demo com 4 desvios pré-gerados
- **Serviços BTP:** CAP · HANA Cloud · Event Mesh · Build Process Automation

### 3. Portal do Franqueado
- **Floorplan:** Overview Page (OVP) — 5 cards
- **Entidades:** `MeusKPIs`, `MinhaSaude`, `BenchmarkMeuCluster`, `MeusDesvios`, `MinhasRecomendacoes`
- **Destaque:** Isolamento de dados via `@restrict` + atributos JWT (`$user.unidade_ID`). Recomendações geradas por job diário via AI Core + GenAI Hub
- **Serviços BTP:** CAP · HANA Cloud · AI Core + GenAI Hub · Event Mesh

### 4. Onboarding
- **Floorplan:** List Report Object Page + Fiori Draft
- **Entidades:** `ProcessosOnboarding`, `EtapasOnboarding`, `TarefasOnboarding`, `DocumentosOnboarding`, `AprovacoesOnboarding`
- **Destaque:** Draft salva progresso automaticamente. BPA orquestra aprovação de documentos com escalação por prazo
- **Serviços BTP:** CAP · HANA Cloud · Build Process Automation · Fiori Draft

---

## Tech Stack

```
@sap/cds              ^10       # CAP backend (OData V4)
@cap-js/sqlite        ^1        # SQLite para desenvolvimento local
sap.fe.templates               # Fiori Elements floorplans (ALP, OVP, LROP)
SAP HANA Cloud                 # Banco de dados em produção
SAP Build Work Zone            # Portal e launchpad
SAP AI Core + GenAI Hub        # Recomendações para franqueados
SAP Event Mesh                 # Alertas em tempo real
SAP Build Process Automation   # Workflows de aprovação
SAP IAS + XSUAA                # Identidade e autorização
```

---

## Estrutura do Projeto

```
MyFranchise/
├── db/
│   ├── schema.cds              # Modelo de dados unificado (4 módulos)
│   └── data/                   # Seed data CSV (35 arquivos)
│       ├── myfranchise-Franqueados.csv       (8 franqueados)
│       ├── myfranchise-Unidades.csv          (20 unidades)
│       ├── myfranchise-KPI_Unidade.csv       (120 KPIs — 20×6 meses)
│       ├── myfranchise-Saude_Unidade.csv     (20 scores)
│       ├── myfranchise-Desvios.csv           (7 desvios — Loja 147)
│       ├── myfranchise-Recomendacoes.csv     (5 recomendações AI)
│       ├── myfranchise-Contratos_Franquia.csv (20 contratos)
│       └── ... (code lists e demais entidades)
├── srv/
│   └── service.cds             # FranqueadoraService + FranqueadoService
├── app/
│   ├── network/                # Painel da Rede (ALP)
│   │   ├── webapp/manifest.json
│   │   └── annotations.cds
│   ├── compliance/             # Governança & Compliance (LROP)
│   │   ├── webapp/manifest.json
│   │   └── annotations.cds
│   ├── franchisee/             # Portal do Franqueado (OVP)
│   │   ├── webapp/manifest.json
│   │   └── annotations.cds
│   └── onboarding/             # Onboarding (LROP + Draft)
│       ├── webapp/manifest.json
│       └── annotations.cds
├── package.json
├── .cdsrc.json
└── README.md
```

---

## Cenário de Demo — Loja 147

A demo ao vivo de 15 minutos usa a **Loja Porto Alegre (código 147)** como unidade em alerta crítico.

| Dado | Valor |
|---|---|
| Score de Saúde | **32 / 100** (crítico — vermelho no ALP) |
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

**Recomendações AI geradas:**
1. `[ALTA]` Corrigir precificação do Tênis Casual e Boné Aba Curva
2. `[MÉDIA]` Reposição prioritária: Vestido Midi com giro alto e margem comprimida
3. `[MÉDIA]` Solicitar treinamento de gestão de preços ao consultor de campo

**Distribuição da rede no ALP:**
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
```

---

## Plano de Build — Dragons' Den 2026

| Semana | Período | Foco | Status |
|---|---|---|---|
| 1 | 29/07 – 04/08 | Backend + dados mock | ✅ Concluído |
| 2 | 05/08 – 11/08 | Fiori annotations (ALP + Object Page + LROP) | 🔄 Em andamento |
| 3 | 12/08 – 18/08 | OVP + GenAI Hub integration | ⏳ Pendente |
| 4 | 19/08 – 25/08 | Polish + Work Zone + ensaios | ⏳ Pendente |
| **D** | **26/08** | **Apresentação** | 🎯 |

---

## Work Zone — Deploy Manual (Semana 4)

Os `manifest.json` de cada app já contêm as configurações necessárias:

| App | `semanticObject` | `action` | Ícone |
|---|---|---|---|
| Painel da Rede | `NetworkPanel` | `display` | `org-chart` |
| Governança & Compliance | `Compliance` | `manage` | `alert` |
| Portal do Franqueado | `FranchiseePortal` | `display` | `home` |
| Onboarding | `Onboarding` | `manage` | `stage` |

Todos compartilham `sap.cloud.service: "myfranchise"` — o Work Zone agrupa os tiles automaticamente.

**Passos para registrar no Work Zone após o deploy:**
1. Work Zone Cockpit → Content Manager → Content Explorer
2. HTML5 Apps → selecionar os 4 apps
3. Criar Business Site → arrastar tiles para o layout
4. Atribuir roles (`Franqueadora_Gestor`, `Franqueado`) ao site

---

## Fase 2 (pós-competição)

- Módulo **Análise de Expansão** — ALP com score de praças + extensão de mapa (Flexible Programming Model)
- **SAP Analytics Cloud** — dashboards executivos para conselho
- **SAP Datasphere** — federação de dados de múltiplas fontes
- Deploy via **MTA com CDM** para Work Zone (automatizado, sem registro manual)
- **Mobile Development Kit (MDK)** — se surgir requisito de offline

---

## Referências

- [CAP Documentation](https://cap.cloud.sap/docs/)
- [SAP Fiori Elements Feature Showcase](https://github.com/SAP-samples/fiori-elements-feature-showcase)
- [OData Annotation Vocabulary](https://ui5.sap.com/#/topic/030faebe70b34198b17a93b4c6e7b4d7)
- [SAP Build Work Zone](https://help.sap.com/docs/build-work-zone-standard-edition)
- [SAP AI Core + GenAI Hub](https://help.sap.com/docs/sap-ai-core)
