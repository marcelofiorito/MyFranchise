# RunMyFranchise — Análise Técnica: SAP Retail Portfolio vs. Gestão de Franquias

**🇧🇷 Português** · [🇬🇧 English](Integração.en.md)

**Projeto:** RunMyFranchise  
**Contexto:** Dragons' Den 2026 — Extensão Side-by-Side no SAP BTP  
**Público-alvo:** SAP Solution Advisors / Júri técnico-executivo  
**Data:** Julho 2026

---

## 1. Sumário Executivo

O SAP possui um dos portfolios de varejo mais completos do mercado. Ainda assim, nenhum produto SAP padrão resolve o problema central de uma franqueadora: **orquestrar processos entre centenas de franqueados independentes, com visibilidade unificada, compliance de marca e inteligência artificial personalizada por loja.**

O RunMyFranchise é uma extensão BTP Side-by-Side que preenche exatamente esse vazio. Este documento mapeia onde o portfolio SAP termina, onde o RunMyFranchise começa, e como o processo de **prevenção de ruptura de estoque com sazonalidade regional** ilustra a proposta de valor com precisão técnica e impacto de negócio mensurável.

---

## 2. O Processo de Negócio Demonstrado: Ruptura de Estoque e Sazonalidade Regional

### O problema real

Uma rede de franquias como a de sandálias Havaianas enfrenta um paradoxo logístico em julho: enquanto lojas no **Nordeste** vendem em ritmo acelerado (verão regional, turismo, demanda 1,8× a média), lojas no **Sul** estão em pleno inverno e o giro cai para 0,4× da média. Um pedido de reposição uniforme desperdiça capital de giro no Sul e gera ruptura no Nordeste.

### Como o RunMyFranchise resolve

A solução implementa um **Agente de Reposição** (`srv/ai/reposicao-agent.js`) que opera com três camadas de inteligência:

1. **Detecção de risco** — calcula `coberturaDias = saldoAtual ÷ (giroMedioDiario × fatorSazonal × upliftPromocional)`. Se `coberturaDias < leadTimeDias`, o item está em risco real de ruptura antes que uma reposição chegue.

2. **Sazonalidade regional** — a entidade `Sazonalidade_Regional` armazena o fator de demanda por `categoria × região × mês`. Para Sandálias em julho no Nordeste: fator 1,8. No Sul: 0,4. Esse fator é aplicado dinamicamente, sem código fixo.

3. **Geração de pedidos com justificativa em linguagem natural** — quando o SAP AI Core está disponível, o agente invoca o **gpt-4o via SAP GenAI Hub** com um prompt estruturado que cita saldo, cobertura em dias, lead time e sazonalidade regional. O modelo retorna um array JSON com quantidade sugerida, fornecedor e justificativa textual.

4. **Aprovação humana** — os pedidos são criados em status `PENDENTE`. Nenhum pedido é enviado automaticamente. O aprovador revisa via SAP Fiori Elements antes de confirmar — padrão *human-in-the-loop* conforme exigências regulatórias de processos de compra.

O fluxo de status é: `PENDENTE → APROVADO / RECUSADO → ENVIADO → RECEBIDO`.

**Guardrails de IA responsável:** O agente opera com prompt estruturado que inclui exclusivamente dados factuais extraídos do modelo CDS (saldo atual, cobertura em dias, fator sazonal, lead time). O LLM gera a narrativa de justificativa — não os números de quantidade ou os fatores de cálculo. Qualquer divergência entre a sugestão do modelo e os dados reais é detectável pelo aprovador humano na tela de revisão Fiori. Adicionalmente, o SAP AI Launchpad permite monitorar deployments, logs de inferência e consumo de tokens do agente em produção.

---

## 3. Portfolio SAP Retail: O que cada produto cobre

| Produto SAP | Domínio principal | Capacidade relevante para varejo/franquias |
|---|---|---|
| **S/4HANA (MM/SD/WM/EWM)** | ERP core | Gestão de materiais, ordens de compra, movimentos de estoque, WMS em centros de distribuição próprios |
| **SAP CAR (Customer Activity Repository)** | Análise de POS | Agregação de transações de ponto de venda, demand sensing em tempo real, histórico de vendas por loja/SKU |
| **SAP IBP (Integrated Business Planning)** | Planejamento de demanda | Previsão estatística, ajuste de sazonalidade em nível de rede, S&OP colaborativo entre fornecedor e varejista |
| **SAP Omnichannel POS (Unified POS / POS DM)** | Ponto de venda | Processamento de transações, integração com loyalty, dados de venda em tempo real para CAR |
| **SAP Ariba** | Procurement | Gestão de fornecedores, contratos, cotações, pedidos de compra com aprovação |
| **SAP Analytics Cloud (SAC)** | BI / Dashboards executivos | Relatórios de performance, dashboards de rede, análises ad hoc com dados do S/4HANA e CAR |
| **SAP Datasphere** | Federação de dados | Camada semântica unificada, conexão de fontes heterogêneas, data mesh |
| **SAP Commerce Cloud (Hybris)** | E-commerce B2C/B2B | Catálogo digital, loja online, integração com S/4HANA para pricing e estoque |
| **SAP Emarsys** | Marketing / CRM | Campanhas personalizadas, engagement de clientes finais, automação de e-mail/push |

### O que nenhum desses produtos resolve nativamente

Nenhum produto da tabela acima possui um **módulo de gestão de franquias para varejo/consumer goods**. Não há no portfolio SAP padrão uma solução que:

- Mantenha o registro de cada franqueado como entidade jurídica independente com CNPJ, contrato, score de saúde e regras de compliance individualizadas;
- Detecte desvios de preço praticado *na loja do franqueado* em relação ao catálogo da franqueadora;
- Gere recomendações de ação personalizadas por loja usando IA, considerando o cluster de performance e a região geográfica;
- Ofereça ao franqueado um portal self-service para acompanhar seus próprios KPIs, desvios, tarefas de onboarding e pedidos de reposição — com isolamento total de dados entre franqueados concorrentes.

> **Nota técnica:** O SAP S/4HANA On-Premise possui um módulo chamado *"Distribution Franchisee Management"*, específico para a indústria de **Utilities na Índia** — onde franqueados executam leitura de medidores, distribuição de faturas e coleta de pagamentos para concessionárias de energia. Este módulo não se aplica ao modelo de franquia de varejo/consumer goods, onde o franqueado é uma entidade comercial independente gerindo loja própria, catálogo, pricing e estoque com autonomia operacional.

O IBP, por exemplo, é capaz de planejar em granularidade de localização individual (location-product) e aplicar fatores sazonais via DDMRP (Demand-Driven Replenishment). No entanto, ele não modela a **relação contratual franqueador-franqueado**: não mantém score de saúde por unidade, não gerencia compliance de marca, não gera recomendações contextualizadas por IA para cada loja, e não oferece um portal self-service com isolamento de dados entre entidades jurídicas concorrentes. O IBP não sabe que a loja `u147-Porto Alegre` tem um franqueado diferente da loja `u189-Fortaleza`, com autonomia operacional, contrato distinto e necessidades de comunicação individualizadas.

> **Roadmap:** O *SAP Retail Planning Hub* (H1/H2 2026) está introduzindo capacidades nativas de demand forecasting e replenishment para lojas individuais no Public Cloud. Essas capacidades complementam — e não substituem — a camada de orquestração de rede franqueada que o RunMyFranchise oferece, pois não endereçam a gestão do relacionamento franqueador-franqueado.

---

## 4. O Gap de Franquia — A Extensão Side-by-Side

O RunMyFranchise opera como uma **extensão CAP (Cloud Application Programming Model)** no SAP BTP. Não substitui o S/4HANA — estende o que ele não cobre. A arquitetura é deliberadamente "side-by-side": dados operacionais vivem no core SAP, a inteligência de rede franqueada vive no BTP.

Os módulos cobertos pelo RunMyFranchise e ausentes no portfolio padrão:

| Módulo RunMyFranchise | Problema resolvido | Por que o SAP padrão não resolve |
|---|---|---|
| **Painel da Rede** | Score de saúde por unidade (performance + compliance + contrato) com criticality e benchmark por cluster | O SAC mostra KPIs, mas não tem o conceito de "franqueado" como entidade com score próprio |
| **Compliance de Preços** | Detecção automática de desvio entre preço praticado e catálogo da franqueadora | O S/4HANA não acessa o preço praticado na loja do franqueado (sistema independente) |
| **Recomendações IA** | Recomendações personalizadas geradas por gpt-4o via SAP AI Core, contextualizadas por loja e região | O SAP Joule é assistente; não gera recomendações proativas por unidade da rede |
| **Agente de Reposição** | Pedidos de reposição com sazonalidade regional e aprovação humana | O IBP planeja supply chain; não gerencia o relacionamento com o franqueado independente nem gera justificativas em linguagem natural |
| **Portal do Franqueado** | Visão isolada (por `unidade_ID`) de KPIs, desvios, reposição e recomendações | Não existe no portfolio SAP um portal self-service nativo para franqueados |
| **Onboarding** | Fluxo de abertura de loja com etapas, documentos e aprovações rastreáveis | O S/4HANA tem workflow, mas não um processo pré-configurado de onboarding de franquia |
| **Estoque Sazonal** | Cobertura calculada com fator regional × calendário promocional em tempo real por loja | O IBP suporta DDMRP por localização, mas não contextualiza com o perfil contratual do franqueado nem dispara alertas personalizados por unidade |

---

## 5. Mapeamento de Domínios: Sistema Proprietário por Processo

| Processo na demo | Sistema SAP proprietário em produção | RunMyFranchise preenche o gap em |
|---|---|---|
| Monitoramento de estoque (saldo, giro, cobertura) | S/4HANA MM / WM — via API de estoque | Cálculo de cobertura com sazonalidade regional; alerta por loja franqueada |
| Leitura de vendas por SKU/loja | SAP CAR ← SAP POS DM | Detecção de desvio de preço praticado; geração de pedido contextualizado |
| Planejamento de demanda sazonal | SAP IBP | Fator sazonal por categoria × região × mês aplicado em tempo real na loja |
| Pedido de reposição ao fornecedor | SAP Ariba (cotação/contrato) | Rascunho de pedido com justificativa em linguagem natural; aprovação franqueadora |
| Dashboard executivo da rede | SAP Analytics Cloud | Score de saúde individual por unidade; benchmark anonimizado por cluster |
| Comunicação com o franqueado | SAP Emarsys / e-mail | Portal self-service isolado por `unidade_ID` com OData seguro (XSUAA + instance-based auth) |
| Abertura de nova loja | Múltiplos sistemas (Ariba, S/4HANA, BPA) | Fluxo unificado de onboarding: etapas, tarefas, documentos, aprovações |

---

## 6. Fluxo de Dados: Demo vs. Produção

### Demo (atual — seed CSV no HANA Cloud)

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

### Produção (caminho recomendado com integração SAP)

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

A integração com o ERP core opera em dois modos complementares:

- **SAP Event Mesh** (padrão publish-subscribe): o S/4HANA emite Business Events via Enterprise Event Enablement quando há movimentações de estoque relevantes. O RunMyFranchise consome esses eventos em tempo real para recalcular cobertura e disparar alertas de ruptura — sem polling e sem replicação de dados.
- **SAP Integration Suite** (APIs síncronas): para operações que exigem leitura sob demanda (consulta de saldo pontual) ou escrita (criação de Purchase Order no Ariba), o Integration Suite atua como barramento com roteamento, transformação e segurança centralizados.

O **SAP Datasphere** pode federar dados do CAR e do S/4HANA para enriquecer o contexto do agente sem movimentação de dados.

---

## 7. Joule e o Papel do Copiloto Conversacional

> **Status:** ✅ **Em produção** — MCP Server deployado no Cloud Foundry (`joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com`). Fluxo de aprovação end-to-end validado com 6 pedidos via linguagem natural.

O **SAP Joule** está integrado ao RunMyFranchise via **MCP Server (Model Context Protocol)**, transformando verificações analíticas em conversas naturais. O copiloto já responde consultas e executa aprovações em produção:

- *"Quais lojas têm risco de ruptura de sandálias no Nordeste esta semana?"* → `get_lojas_em_risco(regiao='NE', categoria='Sandálias')`
- *"Quantas unidades de Havaianas Top o agente sugeriu para Recife?"* → `get_cobertura_estoque(unidade_id='u178', sku='SKU-100')`
- *"Qual o score de saúde médio das lojas do cluster STD?"* → `get_score_rede()`
- *"Aprova todos os pedidos de Havaianas pendentes"* → `get_pedidos_pendentes()` + `aprovar_pedido(pedido_id=...)` × N

### MCP Server — 7 tools em produção

| Tool | Entidade OData | Operação |
|---|---|---|
| `get_lojas_em_risco` | `Estoque_Unidade` | Lojas com `estoqueCriticality < 3`, ordenadas por cobertura |
| `get_cobertura_estoque` | `Estoque_Unidade` | Cobertura em dias para uma loja/SKU específico |
| `get_pedidos_pendentes` | `Pedidos_Reposicao` + `Unidades` | Pedidos aguardando aprovação |
| `get_recomendacoes` | `Recomendacoes` + `Unidades` | Recomendações IA (status=NOVA) |
| `get_score_rede` | `Saude_Dashboard` | Score de saúde de toda a rede |
| `aprovar_pedido` | Bound action `FranqueadoraService.aprovar` | POST — PENDENTE → APROVADO |
| `recusar_pedido` | Bound action `FranqueadoraService.recusar` | POST — PENDENTE → RECUSADO |

**Autenticação:** OAuth2 `client_credentials` via XSUAA. CSRF token obtido automaticamente antes de cada POST. Documentação detalhada: `docs/integração/mcp-server.md`.

### Roadmap pós-demo: Joule Capability via A2A

Na evolução futura, o RunMyFranchise pode ser registrado como uma **Joule Capability** via protocolo **A2A (Agent-to-Agent)**, permitindo que o Joule acesse o MCP Server como capability nativa dentro do Work Zone. Nesse modelo, o agente intermediário (CAP-based ou LangGraph) expõe as ações OData via card A2A. A arquitetura MCP atual é o stepping stone para essa integração. Isso completa o arco: do **dado** (S/4HANA + CAR) à **inteligência** (gpt-4o via AI Core) à **conversa** (Joule via MCP → A2A).

---

## 8. Modelo de Segurança e Isolamento de Dados

O isolamento entre franqueados é implementado via **instance-based authorization** com XSUAA e SAP Cloud Identity Services (IAS):

- Cada usuário franqueado recebe um atributo customizado `unidadeId` no IAS/XSUAA durante o onboarding.
- O CAP aplica filtros automáticos em todas as queries OData via anotações `@restrict` com `where: 'unidade_ID = $user.unidadeId'`.
- Nenhuma query cross-franqueado é possível sem o role `FranqueadoraAdmin`.
- O padrão é **single-tenant com row-level security** — adequado para redes de até centenas de unidades. Para escala SaaS multi-tenant (múltiplas redes franqueadoras), o CAP suporta promoção para o modelo `@multitenancy` com subscriber tenants isolados.

Esse design garante que o franqueado A nunca acessa dados do franqueado B — mesmo que ambos operem na mesma instância da aplicação.

---

## 9. A Proposta de Valor

O RunMyFranchise não compete com o portfolio SAP — **o pressupõe**. Ele é a camada de orquestração que conecta:

- O **S/4HANA** (fonte da verdade de estoque e materiais)
- O **AI Core / GenAI Hub** (inteligência gerada pelo LLM com dados reais da loja)
- O **franqueado** (que hoje não tem acesso direto a nenhum desses sistemas)

A extensão side-by-side no BTP é o padrão arquitetural que a SAP recomenda para exatamente esse cenário: quando o processo de negócio exige lógica que vai além do que o produto core entrega nativamente, sem customizações no núcleo que dificultem upgrades.

Para redes de franquias, esse gap é estrutural e não será preenchido pelos produtos core no curto prazo — o modelo de franquia pressupõe entidades jurídicas independentes, o que cria complexidades de acesso, isolamento de dados e personalização que o ERP padrão não foi projetado para resolver.

O RunMyFranchise é a resposta técnica a esse gap, construída sobre o stack SAP BTP, com zero dependência de produtos de terceiros para a camada de infraestrutura, e pronta para integrar com o portfolio SAP completo na fase 2.

---

## 10. DE-PARA: Modelo de Dados da Demo × Soluções SAP em Produção

Esta seção mapeia **cada entidade do modelo CDS** usado na demo para o sistema SAP proprietário em produção, incluindo a API/módulo específico, a direção do fluxo de dados e o mecanismo de integração.

### 10.1 Entidades do Domínio — Mapeamento Completo

| Entidade RunMyFranchise (CDS) | Campos-chave | Sistema SAP proprietário (produção) | API / Módulo SAP | Direção do fluxo | Mecanismo de integração |
|---|---|---|---|---|---|
| **Franqueados** | `ID`, `cnpj`, `razaoSocial`, `nomeFantasia`, `contratoInicio`, `contratoFim`, `status`, `cluster` | **SAP S/4HANA** (Business Partner) | API_BUSINESS_PARTNER (OData V4) — Role: `FLVN01` (Vendor/Franchisee) | BTP ← S/4HANA | SAP Integration Suite (sync pull) |
| **Unidades** | `ID`, `franqueado_ID`, `nome`, `cidade`, `estado`, `regiao`, `scoresSaude`, `criticality` | **SAP S/4HANA** (Plant / Sales Org) | API_PLANT / API_SALESORGANIZATION + Extensão BTP (score calculado) | BTP ← S/4HANA + cálculo local | Integration Suite + Event Mesh (plant changes) |
| **Estoque_Unidade** | `unidade_ID`, `material_ID`, `saldoAtual`, `giroMedioDiario`, `ultimaAtualizacao` | **SAP S/4HANA MM** | API_MATERIAL_STOCK (posição de estoque por planta) | BTP ← S/4HANA | Event Mesh (Goods Movement events) |
| **Materiais** | `ID`, `descricao`, `categoria`, `sku`, `fornecedor_ID`, `leadTimeDias`, `precoSugerido` | **SAP S/4HANA MM** | API_PRODUCT (Master Data) | BTP ← S/4HANA | Integration Suite (sync pull / delta) |
| **Sazonalidade_Regional** | `ID`, `categoria`, `regiao`, `mes`, `fatorDemanda` | **SAP IBP** (Demand Planning) ou **extensão BTP** | IBP: Planning Areas com dimensão Location × Product Group × Time / BTP: tabela local gerenciada pela franqueadora | BTP ← IBP (se existir) ou dado local | CI-DS (Cloud Integration for Data Services) / manual |
| **Pedidos_Reposicao** | `ID`, `unidade_ID`, `material_ID`, `quantidade`, `fornecedor_ID`, `status`, `justificativaIA`, `dataCriacao`, `dataAprovacao` | **SAP Ariba** (Purchase Order) / **SAP S/4HANA MM** (PO) | API_PURCHASEORDER_PROCESS_SRV (criação de PO) / Ariba Procurement API | BTP → S/4HANA/Ariba | Integration Suite (sync push — após aprovação) |
| **Vendas_Diarias** | `unidade_ID`, `material_ID`, `data`, `quantidadeVendida`, `precoUnitarioPraticado`, `receita` | **SAP CAR** (Customer Activity Repository) ← SAP POS DM | CAR POS Inbound API / ODP (Operational Data Provisioning) | BTP ← CAR | Integration Suite (batch daily) ou Datasphere (federation) |
| **Desvios_Preco** | `ID`, `unidade_ID`, `material_ID`, `precoSugerido`, `precoPraticado`, `percentualDesvio`, `dataDeteccao`, `status` | **Calculado no BTP** (comparação Vendas_Diarias vs. Materiais.precoSugerido) | Não existe em SAP padrão — lógica 100% BTP | Interno BTP | N/A (cálculo local CAP) |
| **Recomendacoes_IA** | `ID`, `unidade_ID`, `tipo`, `titulo`, `descricao`, `prioridade`, `status`, `dataCriacao`, `modeloIA` | **SAP AI Core** (GenAI Hub — gpt-4o) | GenAI Hub Inference API (`/v2/inference/deployments/{id}/invoke`) | BTP ↔ AI Core | SDK @sap-ai-sdk/ai-api (chamada direta) |
| **Onboarding_Fluxos** | `ID`, `unidade_ID`, `etapa`, `responsavel`, `status`, `dataInicio`, `dataConclusao`, `documentoUrl` | **SAP Build Process Automation** (workflow) / extensão BTP | SPA Workflow API / tabela local CAP | BTP ↔ SPA | Destination Service (se SPA) ou local |
| **Calendario_Promocional** | `ID`, `nome`, `dataInicio`, `dataFim`, `categorias`, `upliftEsperado`, `regioes` | **SAP Emarsys** (Campaign Calendar) ou **extensão BTP** | Emarsys API / tabela local gerenciada | BTP ← Emarsys ou dado local | Open Connectors / REST adapter |
| **Usuarios_Franqueado** | `ID`, `unidade_ID`, `email`, `nome`, `role`, `ultimoAcesso` | **SAP Cloud Identity Services (IAS)** | SCIM API (Identity Directory) + XSUAA (autorização) | BTP ← IAS | IAS provisioning / XSUAA runtime |
| **Scores_Saude** | `unidade_ID`, `periodo`, `scorePerformance`, `scoreCompliance`, `scoreContrato`, `scoreGeral`, `cluster` | **Calculado no BTP** (agregação de KPIs multi-fonte) | Não existe em SAP padrão — lógica 100% BTP | Interno BTP | N/A (cálculo local CAP) |

### 10.2 Fluxo de Dados por Processo de Negócio

#### Processo 1: Detecção de Ruptura e Pedido de Reposição

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

#### Processo 2: Compliance de Preços

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

#### Processo 3: Score de Saúde da Unidade

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
│  └─────────────────────────────────┬───────────────────────────┘                   │
│                                     │                                               │
│                                     ▼                                               │
│  Scores_Saude (persistido) + Unidades.criticality (atualizado)                     │
│         │                                                                           │
│         └──► SAP Analytics Cloud (via Datasphere — federation para dashboards)     │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Mapeamento de APIs SAP por Entidade (DE-PARA detalhado)

| Dado no RunMyFranchise | Campo(s) | API SAP em Produção | Endpoint / Entity Set | Operação |
|---|---|---|---|---|
| Saldo de estoque por planta | `saldoAtual` | S/4HANA — Material Stock | `API_MATERIAL_STOCK/A_MatlStkInAcctMod` | GET (filtro: Plant + Material) |
| Dados do material (master) | `descricao`, `categoria`, `sku`, `leadTimeDias` | S/4HANA — Product Master | `API_PRODUCT_SRV/A_Product` | GET |
| Fornecedor preferencial | `fornecedor_ID`, `leadTimeDias` | S/4HANA — Purchasing Info Record | `API_INFORECORD_PROCESS_SRV/A_PurchasingInfoRecord` | GET |
| Preço sugerido (catálogo) | `precoSugerido` | S/4HANA — Condition Records (Pricing) | `API_SLSPRICINGCONDITIONRECORD_SRV` | GET |
| Vendas POS por loja | `quantidadeVendida`, `precoUnitarioPraticado` | SAP CAR — POS Transaction | CAR ODP: `2LIS_13_VDITM` ou POSDTA_INBOUND | GET (batch) |
| Dados do franqueado (BP) | `cnpj`, `razaoSocial`, `contratoInicio` | S/4HANA — Business Partner | `API_BUSINESS_PARTNER/A_BusinessPartner` | GET |
| Planta / Loja (unidade) | `nome`, `cidade`, `estado` | S/4HANA — Plant Master | `API_PLANT/A_Plant` (ou extensão custom field) | GET |
| Criação de Purchase Order | `quantidade`, `material_ID`, `fornecedor_ID` | S/4HANA — Purchase Order | `API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder` | POST |
| Movimento de mercadoria (evento) | — | S/4HANA — Material Document | Business Event: `sap.s4.beh.materialdocument.v1.MaterialDocument.Created` | Event (subscribe) |
| Previsão de demanda (se IBP) | `fatorDemanda` por location | SAP IBP — Planning View | IBP Cloud Integration CI-DS / OData API | GET (batch) |
| Campanha promocional | `upliftEsperado`, `dataInicio`, `dataFim` | SAP Emarsys — Campaign API | Emarsys Contact & Campaign API | GET |
| Identidade do usuário franqueado | `email`, `role`, `unidade_ID` | SAP Cloud Identity Services | SCIM 2.0 API (`/scim/Users`) | GET / provisioning |
| Inferência IA (justificativa) | `justificativaIA` | SAP AI Core — GenAI Hub | `/v2/inference/deployments/{deploymentId}/invoke` | POST |

### 10.4 Eventos SAP S/4HANA Consumidos (Event Mesh)

| Evento (CloudEvents type) | Trigger no S/4HANA | Ação no RunMyFranchise |
|---|---|---|
| `sap.s4.beh.materialdocument.v1.MaterialDocument.Created` | Goods Receipt / Goods Issue (MIGO) | Atualiza `Estoque_Unidade`; dispara cálculo de cobertura |
| `sap.s4.beh.purchaseorder.v1.PurchaseOrder.Changed` | Status change da PO (confirmação fornecedor) | Atualiza `Pedidos_Reposicao.status` → `ENVIADO` ou `RECEBIDO` |
| `sap.s4.beh.businesspartner.v1.BusinessPartner.Changed` | Atualização cadastral do franqueado | Atualiza `Franqueados` (endereço, status, dados contratuais) |
| `sap.s4.beh.product.v1.Product.Changed` | Alteração de master data do material | Atualiza `Materiais` (preço sugerido, lead time, descrição) |

### 10.5 Serviços OData Expostos pelo RunMyFranchise

| Serviço CAP | Path | Público-alvo | Entidades expostas | Autorização |
|---|---|---|---|---|
| **FranqueadoraService** | `/franqueadora` | Usuários da franqueadora (gestores, analistas) | Franqueados, Unidades, Estoque_Unidade, Pedidos_Reposicao, Desvios_Preco, Recomendacoes_IA, Scores_Saude, Onboarding_Fluxos, Sazonalidade_Regional, Calendario_Promocional | Role: `FranqueadoraAdmin`, `FranqueadoraAnalista` |
| **FranqueadoService** | `/franqueado` | Usuários do franqueado (lojistas) | Unidades (filtered by unidade_ID), Estoque_Unidade, Pedidos_Reposicao, Desvios_Preco, Recomendacoes_IA | Role: `Franqueado` — filtrado por `$user.unidadeId` |

### 10.6 Resumo Visual: DE-PARA por Camada

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

## 11. S/4HANA Public Cloud — Transações por Processo

Esta seção detalha as **transações específicas do S/4HANA Public Cloud** que substituiriam os dados simulados (CSV seed) em produção, mapeadas por processo de negócio.

---

### 11.1 Estoque (substitui `Estoque_Unidade` seed CSV)

| Dado atual (demo) | Transação S/4HANA Public Cloud | App Fiori / Tile | API OData |
|---|---|---|---|
| `saldoAtual` por loja/SKU | **Stock Overview** — `MM_MATL_STOCK_VALUE_0001` | Manage Stock | `API_MATERIAL_STOCK_SRV` / `A_MatlStkInAcctMod` |
| `giroMedioDiario` | **Material Consumption Report** | Analyze Material Consumption | ODP: `2LIS_03_BF` (goods movements) |
| `leadTimeDias` | **Purchasing Info Record** — `MM_PUR_INFORECORD_MANAGE` | Manage Purchasing Info Records | `API_INFORECORD_PROCESS_SRV` / `A_PurchasingInfoRecord` |
| `estoqueMinimo` | **MRP Settings / Material Master** — `MM_MATL_MANAGE_0001` | Manage Products | `API_PRODUCT_SRV` / `A_ProductPlant` (`MinimumStockQuantity`) |
| Movimentações em tempo real | **Post Goods Movement** — `MM_MATL_GOODS_MOVEMENT_0001` | Post Goods Movement | Business Event: `MaterialDocument.Created` (Event Mesh) |

**Observação:** Em produção, `coberturaDias` e `estoqueCriticality` continuam sendo calculados no CAP (lógica de sazonalidade regional não existe no S/4HANA padrão).

---

### 11.2 Vendas / Preços Praticados (substitui `VendaPraticada` seed CSV)

| Dado atual (demo) | Transação S/4HANA Public Cloud | App Fiori / Tile | API OData |
|---|---|---|---|
| `precoPraticado` por SKU/loja | **Sales Order** — `SD_SELL_FROM_STOCK_0001` | Manage Sales Orders | `API_SALES_ORDER_SRV` / `A_SalesOrderItem` (`NetAmount`, `MaterialPriceGroup`) |
| `qtdVendida` por período | **Billing Document** — `SD_BILLING_CREATE_0101` | Create Billing Documents | `API_BILLING_DOCUMENT_SRV` / `A_BillingDocumentItem` |
| Preços praticados em POS | **SAP CAR ← POS DM** | — | CAR ODP `2LIS_13_VDITM` (SD Sales Item) |
| `precoAutorizado` (catálogo) | **Condition Records** — `SD_COND_RECORDS_MANAGE` | Manage Prices — Sales | `API_SLSPRICINGCONDITIONRECORD_SRV` / `A_SlsPrcgCndnRecdValidity` |

**Observação:** A detecção de desvio de preço (`Desvios`) continua sendo calculada no CAP — não existe transação S/4HANA que compare o preço praticado pelo franqueado com o catálogo da franqueadora automaticamente.

---

### 11.3 Pedidos de Reposição (substitui geração manual/IA para envio ao fornecedor)

| Passo no fluxo | Transação S/4HANA Public Cloud | App Fiori / Tile | API OData |
|---|---|---|---|
| Criação do pedido após aprovação | **Create Purchase Order** — `MM_PUR_PO_MAINTAIN_0001` | Create Purchase Orders | `API_PURCHASEORDER_PROCESS_SRV` / `A_PurchaseOrder` (POST) |
| Acompanhamento da PO | **Monitor Purchase Orders** — `MM_PUR_PO_MANAGE_0001` | Manage Purchase Orders | `API_PURCHASEORDER_PROCESS_SRV` / `A_PurchaseOrder` (GET) |
| Confirmação de entrega (→ RECEBIDO) | **Post Goods Receipt for PO** — `MM_MATL_GOODS_MOVEMENT_0001` | Post Goods Movements | Business Event: `PurchaseOrder.Changed` → status `RECEBIDO` |
| Fornecedor (supplier) | **Manage Suppliers** — `MM_PUR_VENDOR_MANAGE_0001` | Manage Business Partners | `API_BUSINESS_PARTNER` / `A_Supplier` |
| Via SAP Ariba (alternativo) | Ariba Network — Purchase Order Collaboration | — | Ariba Procurement API / cXML |

---

### 11.4 Dados Mestre de Produtos (substitui `ItensCatalogo` seed CSV)

| Dado atual (demo) | Transação S/4HANA Public Cloud | App Fiori / Tile | API OData |
|---|---|---|---|
| `nomeProduto`, `categoria`, `sku` | **Manage Products** — `MM_MATL_MANAGE_0001` | Manage Products | `API_PRODUCT_SRV` / `A_Product` |
| `precoSugerido` | **Manage Prices** — `SD_COND_RECORDS_MANAGE` | Manage Prices — Sales | `API_SLSPRICINGCONDITIONRECORD_SRV` |
| `leadTimeDias` | **Purchasing Info Record** | Manage Purchasing Info Records | `API_INFORECORD_PROCESS_SRV` |

---

### 11.5 Franqueados / Business Partners (substitui `Franqueados` seed CSV)

| Dado atual (demo) | Transação S/4HANA Public Cloud | App Fiori / Tile | API OData |
|---|---|---|---|
| `razaoSocial`, `cnpj`, `email` | **Manage Business Partners** — `BP_MANAGE_0001` | Manage Business Partners | `API_BUSINESS_PARTNER` / `A_BusinessPartner` |
| `status` (ATIVO/SUSPENSO) | **Change Business Partner** — `BP_CHANGE_0001` | Change Business Partners | `API_BUSINESS_PARTNER` / `A_BusinessPartnerAddress` |
| Contrato de franquia | **Manage Sales Contracts** — `SD_SELL_CONTRACT_PROCESS` | Manage Sales Contracts | `API_SALES_CONTRACT_SRV` |

---

### 11.6 KPIs de Performance (substitui `KPI_Unidade` seed CSV)

| Dado atual (demo) | Transação S/4HANA Public Cloud | App Fiori / Tile | API OData |
|---|---|---|---|
| `faturamento` mensal | **Billing Documents** por período/loja | Display Billing Documents | `API_BILLING_DOCUMENT_SRV` / `A_BillingDocument` |
| `ticketMedio` | Calculado: faturamento ÷ qtdTransacoes | — | Calculado no CAP |
| `qtdTransacoes` | **Sales Orders** por período | Manage Sales Orders | `API_SALES_ORDER_SRV` |
| `nps` | **SAP Emarsys** / pesquisa de satisfação | — | Emarsys Contact API |
| `crescimentoMoM/YoY` | Calculado no CAP comparando períodos de billing | — | Calculado no CAP |

---

### 11.7 Sazonalidade e Calendário Promocional

| Dado atual (demo) | Origem em produção | Transação / Sistema | Observação |
|---|---|---|---|
| `Sazonalidade_Regional` (fator por categoria × região × mês) | **SAP IBP** — Demand Planning | Statistical Forecasting — IBP Planning View | Fator sazonal extraído via CI-DS (Cloud Integration for Data Services) ou mantido manualmente pela franqueadora no BTP |
| `Calendario_Promocional` (uplift por campanha) | **SAP Emarsys** — Campaign Calendar | Campaign Manager | Integração via Open Connectors REST adapter |

---

### 11.8 Resumo: O que permanece no BTP vs. o que vem do S/4HANA

| Domínio | Fonte de dados (produção) | Permanece no BTP |
|---|---|---|
| Saldo de estoque | S/4HANA MM (API_MATERIAL_STOCK) | Cálculo de cobertura + sazonalidade |
| Movimentações de estoque | S/4HANA Event Mesh | Trigger de recálculo |
| Preço praticado | S/4HANA SD / SAP CAR | Cálculo de desvio vs. catálogo |
| Master de produtos | S/4HANA MM (API_PRODUCT) | Enriquecimento com dados de sazonalidade |
| Business Partners | S/4HANA BP (API_BUSINESS_PARTNER) | Score de saúde por franqueado |
| KPIs financeiros | S/4HANA SD Billing | Cálculo de ticket médio, crescimento, NPS |
| Pedido de reposição | Criado no BTP → enviado ao S/4HANA/Ariba | Lógica de aprovação, justificativa IA |
| Score de saúde | Calculado no BTP | 100% BTP — não existe no S/4HANA |
| Desvio de compliance | Calculado no BTP | 100% BTP — não existe no S/4HANA |
| Recomendações IA | SAP AI Core (GPT-4o) | Orquestração + persistência no BTP |
| Portal do franqueado | BTP Work Zone + CAP | 100% BTP — isolamento por unidade_ID |
| Onboarding | BTP (CAP + opcionalmente BPA) | 100% BTP |



- [SAP S/4HANA Retail](https://www.sap.com/products/s4hana-erp.html)
- [SAP Customer Activity Repository](https://www.sap.com/products/customer-activity-repository.html)
- [SAP Integrated Business Planning](https://www.sap.com/products/ibp.html)
- [SAP IBP — Demand-Driven Replenishment (DDMRP)](https://help.sap.com/docs/SAP_INTEGRATED_BUSINESS_PLANNING/feae3cea3cc549aaa9d9de7d363a83e6/0503ebd965af4531b376b371b38f1e6c.html)
- [SAP Ariba](https://www.sap.com/products/spend-management/ariba-network.html)
- [SAP Analytics Cloud](https://www.sap.com/products/analytics-cloud.html)
- [SAP Datasphere](https://www.sap.com/products/datasphere.html)
- [SAP AI Core + GenAI Hub](https://help.sap.com/docs/sap-ai-core)
- [SAP Event Mesh — Enterprise Event Enablement](https://help.sap.com/docs/event-mesh)
- [SAP BTP — Extensões Side-by-Side](https://help.sap.com/docs/btp)
- [SAP BTP Developer's Guide — Side-by-Side CAP Extension](https://help.sap.com/docs/BTP/0c8c1db388f645159e134a005aaabbcf/2289e25a0e494f03867c195454b6eaea.html)
- [SAP Joule — Capabilities](https://help.sap.com/docs/JOULE/82a14f108cfa4d4788244d81371e072b/41de8c499c72413c8e134493686a5348.html)
- [SAP S/4HANA — Distribution Franchisee Management (Utilities)](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/181023b0d46f417b82eed136aa57029b/526df057f3944183a9460429f3b9903a.html)
- [SAP S/4HANA — Business Events (Enterprise Event Enablement)](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/8308e6d301d54584a33cd04a9861bc52/8cbf952e55364254be2da77aa1342aa5.html)
- [SAP S/4HANA — API_MATERIAL_STOCK](https://api.sap.com/api/API_MATERIAL_STOCK_SRV/overview)
- [SAP S/4HANA — API_PURCHASEORDER_PROCESS_SRV](https://api.sap.com/api/API_PURCHASEORDER_PROCESS_SRV/overview)
- [SAP S/4HANA — API_BUSINESS_PARTNER](https://api.sap.com/api/API_BUSINESS_PARTNER/overview)
- [SAP Cloud Identity Services — SCIM API](https://help.sap.com/docs/cloud-identity-services)
