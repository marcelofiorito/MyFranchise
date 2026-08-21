# RunMyFranchise — Tropicália Co.

**🇧🇷 Português** · [🇬🇧 English](README.en.md)

> Plataforma de inteligência operacional para redes de franquias de moda tropical no SAP BTP.

---

## Visão Geral

**Tropicália Co.** é uma rede de franquias de moda tropical com 7 lojas em Brasil, Argentina, EUA e Portugal. A plataforma RunMyFranchise conecta franqueadora e franqueados em tempo real, com dados centralizados no HANA Cloud e SAP Joule como copiloto de IA.

**Cenário da demo:** Crise de ruptura de estoque às vésperas da campanha "Verão Tropical" (início: 12/08/2026). A loja SP Jardins está a 2 dias de zerar o Chinelo Tucano Azul Ipanema tamanho 37-38 — com NPS caindo de 9,2 para 5,4 e R$ 42.500 em risco só nessa loja.

---

## Stack Técnico

| Camada | Tecnologia |
|---|---|
| Dados | HANA Cloud — schema `RUNMYFRANCHISE_JG` |
| Camada Semântica | SAP Datasphere — Space `I831004` |
| Dashboards | SAP Analytics Cloud (SAC) — Live Connection via Datasphere |
| Portal | SAP Build Work Zone Advanced — UI Integration Cards + Apps |
| Backend | SAP CAP (Node.js) — `myfranchise-srv` |
| MCP / Joule | Node.js Express + `@modelcontextprotocol/sdk` — `myfranchise-mcp` |
| Frontend | SAP Fiori Elements (UI5) — 9 apps |
| AI | SAP Joule via MCP + SAP AI Core |
| Eventos | Advanced Event Mesh (AEM) |
| Deploy | SAP BTP Cloud Foundry — org `sa-build-platform-org`, space `DEV` |

---

## Arquitetura de Dados

O schema `RUNMYFRANCHISE_JG` (HANA Cloud) é a fonte de verdade para toda a plataforma:

```
Tabelas S/4HANA Fashion   →  MARA, MAKT, MAW1, FSH_COLLECTIONS, KLAH, KSSK, AUSP
Tabelas Master (M_*)      →  M_STORE, M_CAMPAIGN, M_SUBSTITUTE, M_ARTICLE_GRADE...
Tabelas Transacionais     →  T_INVENTORY_SNAPSHOT, T_NPS, T_SELLOUT_HDR/ITM...
         ↓
Semantic Layer: CV_DIM_* (4 views dimensão) + CV_FACT_* (4 views fato)
         ↓
Procedures: P_STOCKOUT_ALERT · P_SUBSTITUTE_SUGGEST · P_GENERATE_SELLIN_ORDER
         ↓
Datasphere (Space I831004): Remote Tables → Dimension Views → Fact Views → Analytic Models
         ↓
SAC (Live Connection) + Work Zone (Cards) + Joule (MCP — 7 tools)
```

---

## Lojas Ativas

| Store ID | Cidade | País |
|---|---|---|
| BR-SP-001 | São Paulo (Jardins) | Brasil 🇧🇷 |
| BR-RJ-001 | Rio de Janeiro (Ipanema) | Brasil 🇧🇷 |
| BR-MG-001 | Belo Horizonte (Savassi) | Brasil 🇧🇷 |
| BR-RS-001 | Porto Alegre | Brasil 🇧🇷 |
| AR-BA-001 | Buenos Aires | Argentina 🇦🇷 |
| US-MIA-001 | Miami | EUA 🇺🇸 |
| PT-LIS-001 | Lisboa | Portugal 🇵🇹 |

---

## MCP Server — SAP Joule

O Joule acessa dados em tempo real via MCP Server deployado no CF.

**URL:** `https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com`
**Destination BTP:** `RunMyFranchise-MCP`
**Health check:** `GET /health`

| Tool | Descrição |
|---|---|
| `get_stockout_alert` | Alertas de ruptura por loja/SKU com receita em risco |
| `get_substitute_suggest` | Substitutos em estoque com script de venda |
| `generate_replenishment_order` | Gera pedido de reposição (DRAFT) com custo total |
| `get_demand_forecast` | Previsão de demanda com fatores clima/campanha/sazonalidade |
| `get_nps_analysis` | NPS por loja com verbatims e correlação com ruptura |
| `get_sellout_summary` | Faturamento, top artigos e top lojas |
| `get_store_overview` | Visão 360° de uma loja: estoque + NPS + vendas + previsão |

---

## Cenário da Demo — Crise Verão Tropical

**Data da demo:** 2026-08-11 | **Campanha inicia:** 2026-08-12

### Personas

| Persona | Papel | Acesso |
|---|---|---|
| **Carlos Mendes** | Head de Operações — Franqueadora | Todas as 7 lojas |
| **Marina Santos** | Proprietária — SP Jardins (BR-SP-001) | Somente a própria loja |

### Números-chave

| Indicador | Valor |
|---|---|
| Lojas em risco crítico | 5 de 7 |
| SKUs críticos na rede | 87 |
| Receita em risco (rede) | R$ 125.000 |
| Receita em risco SP Jardins | R$ 42.500 |
| NPS SP Jardins (ago/2026) | 5,4 (era 9,2 em junho) |
| Detratores SP Jardins | 7 de 11 respostas |
| Estoque excedente Buenos Aires | 178 unidades Tucano Azul Ipanema |
| Impacto climático na demanda | +35% (onda de calor 38°C em SP) |
| Impacto da campanha | +25% |

### Fluxo da demo (~10 min)

1. **Carlos** acessa Work Zone → vê card de alerta de ruptura da rede
2. **Carlos** analisa detalhes no SAC → SP Jardins em vermelho, NPS caindo
3. **Carlos** consulta Joule → análise completa + recomendação de alerta
4. **Carlos** confirma envio de notificação para Marina
5. **Marina** recebe alerta no Work Zone → consulta Joule
6. **Joule** apresenta 3 opções → recomenda **Opção C** (ROI 401%)
7. **Marina** confirma pedido SI-2026-008 → status muda DRAFT → PENDING

---

## Deploy

```bash
# MCP Server (standalone, sem mtar)
cf push myfranchise-mcp

# Configurar senha HANA (NUNCA commitar)
DBPWD='...' && cf set-env myfranchise-mcp HANA_DBADMIN_PASSWORD "$DBPWD"
cf restart myfranchise-mcp

# Verificar
curl https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com/health
```

> **Segurança:** `HANA_DBADMIN_PASSWORD` jamais deve ser commitada. Sempre use `cf set-env` via variável de shell.

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [teste/ROTEIRO_DEMO.md](teste/ROTEIRO_DEMO.md) | Roteiro completo da demo 26/08 com scripts Joule |
| [teste/testes.md](teste/testes.md) | Perguntas de teste para validar as 7 tools do Joule |
| [docs/integração/joule.md](docs/integração/joule.md) | Configuração do Joule Studio |
| [docs/integração/mcp-server.md](docs/integração/mcp-server.md) | Referência técnica do MCP Server |
| [docs/infraestrutura/sac-setup.md](docs/infraestrutura/sac-setup.md) | SAC Story Design — Franchise Network Dashboard |
