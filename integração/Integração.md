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

O **SAP Joule** — copiloto conversacional nativo da SAP — pode ser integrado ao RunMyFranchise para transformar verificações analíticas em conversas naturais. Exemplos de perguntas que o Joule responderia consultando as entidades do BTP:

- *"Quais lojas têm risco de ruptura de sandálias no Nordeste esta semana?"*
- *"Quantas unidades de Havaianas Top o agente sugeriu para Recife?"*
- *"Qual o score de saúde médio das lojas do cluster STD?"*

Na arquitetura de produção, o RunMyFranchise pode ser registrado como uma **Joule Capability** via protocolo **A2A (Agent-to-Agent)**, permitindo que o Joule consulte entidades da extensão em linguagem natural. Nesse modelo, um agente intermediário (LangGraph ou CAP-based) expõe as entidades OData como ações disponíveis para o Joule. Alternativamente, um **MCP server (Model Context Protocol)** expondo as entidades CAP permite integração direta com ferramentas de AI assistida. Isso completa o arco: do **dado** (S/4HANA + CAR) à **inteligência** (gpt-4o via AI Core) à **conversa** (Joule via A2A).

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

## 10. Referências

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
