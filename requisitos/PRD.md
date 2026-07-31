# Product Requirements Document
# RunMyFranchise — Plataforma de Gestão de Redes de Franquias

**🇧🇷 Português** · [🇬🇧 English](PRD.en.md)

| | |
|---|---|
| **Versão** | 1.0 |
| **Data** | Julho 2026 |
| **Status** | Em desenvolvimento |
| **Plataforma** | SAP Business Technology Platform (BTP) |

---

## Índice

1. [Sumário Executivo](#1-sumário-executivo)
2. [Contexto e Motivação](#2-contexto-e-motivação)
3. [Problema](#3-problema)
4. [Solução](#4-solução)
5. [Usuários e Personas](#5-usuários-e-personas)
6. [Objetivos e Métricas de Sucesso](#6-objetivos-e-métricas-de-sucesso)
7. [Requisitos Funcionais](#7-requisitos-funcionais)
8. [Requisitos Não Funcionais](#8-requisitos-não-funcionais)
9. [User Stories](#9-user-stories)
10. [Fora do Escopo MVP](#10-fora-do-escopo-mvp)
11. [Plano de Entregas](#11-plano-de-entregas)
12. [Dependências e Riscos](#12-dependências-e-riscos)
13. [Questões em Aberto](#13-questões-em-aberto)

---

## 1. Sumário Executivo

**RunMyFranchise** é uma plataforma de gestão de redes de franquias construída sobre o SAP Business Technology Platform (BTP). Ela centraliza em uma única experiência digital a visão de performance da rede, o controle de conformidade operacional, o engajamento com franqueados e o processo de abertura de novas unidades.

O produto endereça uma lacuna crítica do mercado: redes de franquias com dezenas a centenas de unidades operam hoje com alta fragmentação de informações, compliance manual e dependência de equipes de campo para tarefas que podem ser automatizadas. Isso limita a capacidade de crescimento e deteriora a qualidade da marca.

**MVP:** Quatro módulos integrados — Painel da Rede, Governança & Compliance, Portal do Franqueado e Onboarding — entregues sobre SAP CAP, Fiori Elements e HANA Cloud, com inteligência artificial generativa para recomendações proativas ao franqueado.

---

## 2. Contexto e Motivação

### Mercado de Franquias no Brasil

O Brasil é o quarto maior mercado de franquias do mundo, com mais de 3.000 redes e 170.000 unidades operando em todo o país (ABF 2025). O setor faturou R$ 240 bilhões em 2024 e cresce a uma taxa de 12% ao ano. Mais da metade das redes planeja expansão nos próximos dois anos.

Apesar desse crescimento, a gestão operacional das redes segue predominantemente artesanal: planilhas, e-mails, visitas físicas de auditoria e relatórios consolidados manualmente. A fragmentação operacional é o principal inibidor de escala.

### Oportunidade

A digitalização da gestão de franquias está em estágio inicial no Brasil. Soluções existentes são parciais (CRM, royalties, ERP) e não oferecem a visão integrada que uma franqueadora em crescimento realmente precisa. Há uma janela de mercado clara para uma plataforma que una visão de rede, compliance automático, engajamento do franqueado e onboarding padronizado em uma única experiência.

### Por que SAP BTP

SAP BTP oferece a combinação de:
- **CAP + HANA Cloud** para backend escalável e queries analíticas de alta performance
- **Fiori Elements** para UX padronizada de nível enterprise sem custo de desenvolvimento frontend alto
- **AI Core + GenAI Hub** para inteligência generativa nativa
- **Event Mesh** para arquitetura orientada a eventos em tempo real
- **Build Work Zone** para portal corporativo multi-app sem desenvolvimento adicional
- **IAS + XSUAA** para gestão de identidade multi-tenant segura

---

## 3. Problema

### Problema central

Franqueadoras que operam redes com 50+ unidades enfrentam crescimento operacional desproporcional ao crescimento da rede. Cada nova unidade adiciona complexidade que os processos atuais não absorvem de forma eficiente.

### Dores específicas identificadas

#### Visibilidade e tomada de decisão

| Sintoma | Impacto |
|---|---|
| KPIs chegam com 2–7 dias de atraso | Decisões baseadas em dados defasados |
| Cada unidade reporta em formato diferente | Consolidação manual consome dias de equipe por mês |
| Não há comparação normalizada entre unidades | Impossível identificar outliers positivos ou negativos |
| Sem segmentação por cluster (porte, região, maturidade) | Mesmo benchmark para lojas incomparáveis |

#### Compliance e padronização da marca

| Sintoma | Impacto |
|---|---|
| Auditoria presencial como único mecanismo de controle | Alto custo, baixa frequência, baixa cobertura |
| Desvios de preço e mix descobertos pelo SAC | Impacto de marca antes de correção |
| Campanhas nacionais sem mecanismo de verificação de adesão | Investimento de marketing desperdiçado |
| Regras de compliance documentadas mas não monitoradas | Corrosão silenciosa do padrão da marca |

#### Relacionamento com franqueados

| Sintoma | Impacto |
|---|---|
| Franqueado não sabe como está em relação à rede | Baixo engajamento, sensação de isolamento |
| Alto volume de chamados operacionais na sede | Custo de suporte elevado, equipe sobrecarregada |
| Diretrizes da sede chegam distorcidas ou não chegam | Execução fragmentada da estratégia |
| Falta de orientação proativa ao franqueado | Oportunidades de melhoria não realizadas |

#### Expansão e onboarding

| Sintoma | Impacto |
|---|---|
| Abertura de nova unidade leva 4–6 meses | Perda de janelas de mercado |
| Processo gerenciado por e-mail e planilha | Sem visibilidade de progresso, alto risco de atraso |
| Decisão de expansão baseada em experiência e intuição | Alocação subótima de investimento |
| Escalabilidade do onboarding não acompanha plano de crescimento | Gargalo operacional no crescimento |

---

## 4. Solução

### Visão do produto

Uma plataforma que transforma a relação entre franqueadora e franqueados: da gestão reativa e fragmentada para o acompanhamento proativo e orientado a dados — com inteligência que escala junto com a rede.

### Proposta de valor

**Para a franqueadora:**
- Visão consolidada de toda a rede em tempo real, sem consolidação manual
- Compliance automático: desvios detectados sem auditores presenciais
- Onboarding padronizado que reduz o tempo de abertura de meses para semanas
- Base de dados confiável para decisões de expansão

**Para o franqueado:**
- Visibilidade da própria performance e posição relativa na rede
- Orientação proativa com recomendações de ação geradas por IA
- Canal único de comunicação com a sede
- Clareza sobre o que está pendente e o que precisa ser feito

### Arquitetura de alto nível

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

## 5. Usuários e Personas

### Persona 1 — Gestor da Franqueadora (primária)

**Representante:** Alexandre Mendes, Diretor de Operações e Expansão

**Perfil:**
- Responsável por 280 lojas em operação
- Objetivo: dobrar a rede em 3 anos
- Disponibilidade: agenda cheia, acessa o painel principalmente segunda de manhã
- Frustrações: dados chegam tarde, muito tempo gasto em consolidação, compliance feito no braço

**Jobs to be done:**
- Identificar rapidamente quais unidades precisam de atenção sem ler relatório
- Garantir que a marca está sendo preservada em todas as unidades
- Tomar decisões de expansão com base em dados de performance por praça
- Apresentar resultados e planos para o conselho com dados confiáveis

**Canais:** Desktop (Fiori Elements via Build Work Zone), relatórios exportados para apresentações

---

### Persona 2 — Franqueado (secundária)

**Representante:** Roberto Mendes, dono da Loja 147 (Porto Alegre)

**Perfil:**
- Opera 1 unidade Standard no segmento fashion/lifestyle
- Foco: resultado da loja, não gestão de sistemas
- Acessa principalmente pelo celular
- Precisa de orientação clara, não de dashboards complexos

**Jobs to be done:**
- Saber se a loja está indo bem ou mal (comparado à rede)
- Entender o que a sede está pedindo e quando precisa responder
- Receber orientação prática sobre o que fazer para melhorar

**Canais:** Browser mobile (responsivo, sem app nativo), notificações push via Work Zone

---

### Persona 3 — Analista de Expansão (terciária, Fase 2)

**Perfil:** Avalia e prioriza novas praças para abertura. Usa dados de performance de unidades existentes para projetar potencial de novas.

**Jobs to be done:** Score de praças, análise geográfica, benchmarks por perfil de cidade

---

## 6. Objetivos e Métricas de Sucesso

### Objetivos estratégicos

| Objetivo | Descrição |
|---|---|
| **Escalabilidade operacional** | Dobrar a rede sem dobrar a equipe de suporte |
| **Padronização da marca** | Zero desvios de preço e mix acima de 7 dias sem correção |
| **Velocidade de expansão** | Reduzir lead time de abertura de 4–6 meses para menos de 6 semanas |
| **Engajamento do franqueado** | Franqueado acessa o portal pelo menos 2x por semana |
| **Decisão baseada em dados** | 100% das decisões de expansão apoiadas por dados de performance |

### KPIs do produto (MVP)

| KPI | Baseline (hoje) | Meta |
|---|---|---|
| Tempo para visão consolidada da rede | D+2 a D+7 | Tempo real (< 1h após ingestão) |
| Desvios de compliance detectados automaticamente | 0% | 100% |
| Tempo médio de abertura de nova unidade | 16–24 semanas | 6 semanas |
| Tempo de consolidação de relatórios (h/semana) | 8–15h por analista | < 1h |
| NPS do franqueado com a sede | Não medido | > 60 em 12 meses |
| Volume de chamados operacionais à sede | Linha de base a medir | Redução de 40% em 6 meses |

---

## 7. Requisitos Funcionais

### 7.1 Módulo: Painel da Rede

**Objetivo:** Oferecer à franqueadora visão consolidada de todas as unidades em tempo real, com segmentação por cluster e alertas automáticos.

**Floorplan Fiori:** Analytical List Page (ALP) + Object Page

#### RF-NET-01 — Score de Saúde por Unidade
- O sistema deve calcular automaticamente um Score de Saúde (0–100) para cada unidade
- Fórmula: 40% performance relativa ao cluster + 40% compliance + 20% status do contrato
- O score deve ser recalculado automaticamente quando novos KPIs ou desvios são registrados
- O score deve ser exibido com semáforo visual: verde (≥70), amarelo (45–69), vermelho (<45)

#### RF-NET-02 — Visão Consolidada (ALP)
- O painel deve exibir todas as unidades em uma lista analítica com gráfico de distribuição por score
- Colunas obrigatórias: Loja, Cluster, Região, Score de Saúde, Faturamento, Crescimento MoM, Alertas Abertos, Status Contrato
- O gráfico de distribuição deve mostrar a proporção de unidades em cada faixa de score (verde/amarelo/vermelho)
- Deve suportar filtragem por cluster, região, status e período

#### RF-NET-03 — Selection Variants pré-configurados
- O painel deve oferecer filtros rápidos pré-configurados:
  - **Críticas:** unidades com score < 45
  - **Vencendo Contrato:** contratos com vencimento em até 30 dias
  - **Destaques:** unidades com score ≥ 80

#### RF-NET-04 — Detalhe da Unidade (Object Page)
- Ao selecionar uma unidade, exibir:
  - KPIs de performance com tendência (últimos 6 meses)
  - Status de compliance com alertas abertos
  - Status do contrato (prazo, valor de royalties)
  - Histórico de score com variação no tempo

#### RF-NET-05 — Ingestão de KPIs
- O sistema deve aceitar dados de KPI via API OData (de sistemas POS/ERP via Integration Suite)
- Ao receber novos KPIs, o score deve ser recalculado automaticamente
- Falhas de ingestão devem ser registradas e alertadas

#### RF-NET-06 — Alertas Automáticos
- O sistema deve gerar alertas automaticamente para:
  - Score de Saúde que cai abaixo de 45
  - Contrato com vencimento em 90 e 30 dias
  - Queda de faturamento > 10% MoM
  - NPS abaixo de 40

---

### 7.2 Módulo: Governança & Compliance

**Objetivo:** Detectar automaticamente desvios do padrão da rede (preço, mix, promoção) e gerenciar o processo de notificação e correção.

**Floorplan Fiori:** List Report Object Page (LROP)

#### RF-COMP-01 — Catálogo de Produtos Autorizado
- A franqueadora deve poder gerenciar o catálogo de produtos autorizados
- Para cada SKU: nome, categoria, preço mínimo, preço máximo e preço sugerido
- O catálogo deve ter vigência definida (data início e fim)
- Alterações no catálogo publicado devem refletir imediatamente nas verificações futuras

#### RF-COMP-02 — Detecção Automática de Desvios
- Ao receber dados de vendas (`VendaPraticada`) de uma unidade, o sistema deve verificar automaticamente:
  - **Desvio de Preço:** preço praticado fora da faixa (mínimo-máximo) do catálogo
  - **Desvio de Mix:** SKU vendido não está no catálogo ativo
  - **Desvio de Promoção:** desconto aplicado não autorizado (futuro)
- A detecção deve ocorrer em tempo real (não em batch noturno)

#### RF-COMP-03 — Classificação por Severidade
- A severidade dos desvios deve ser configurável pela franqueadora via `RegrasCompliance`
- Desvio de preço: Baixa (< limiar médio), Média (≥ limiar médio), Alta (≥ limiar alto)
- Desvio de mix: sempre Alta
- Os limiares padrão sugeridos: Média ≥ 5%, Alta ≥ 15%

#### RF-COMP-04 — Lista de Desvios
- A franqueadora deve visualizar todos os desvios em um List Report filtrável por:
  - Tipo (preço, mix, promoção), Severidade, Status, Unidade, Período
- Selection Variants pré-configurados: "Alta Severidade", "Prazo Vencendo", "Sem Resposta"

#### RF-COMP-05 — Detalhe do Desvio (Object Page)
- O detalhe de um desvio deve mostrar:
  - Comparativo: preço autorizado vs. praticado com percentual de desvio
  - Histórico de notificações enviadas para esta unidade/SKU
  - Desvios anteriores do mesmo SKU na mesma unidade

#### RF-COMP-06 — Notificação ao Franqueado
- Desvios de Alta severidade devem gerar notificação automática ao franqueado
- A notificação deve conter: descrição do desvio, prazo de correção, orientação de ação
- O prazo de correção deve ser configurável por tipo de desvio em `RegrasCompliance`
- Notificações sem resposta até o prazo devem ser escaladas para o gestor da franqueadora

#### RF-COMP-07 — Atualização do Score de Compliance
- A cada novo desvio detectado ou resolvido, o percentual de compliance da unidade deve ser recalculado
- O `compliancePct` em `Saude_Unidade` deve refletir o estado atual (não o histórico)

---

### 7.3 Módulo: Portal do Franqueado

**Objetivo:** Oferecer ao franqueado uma visão clara da sua própria performance, das ações pendentes e de recomendações proativas geradas por IA.

**Floorplan Fiori:** Overview Page (OVP) com 5 cards

#### RF-FRAN-01 — Dashboard do Franqueado (OVP)
- Ao fazer login, o franqueado deve ver uma Overview Page com:
  - **Card 1:** Meus KPIs — faturamento, ticket médio, NPS, crescimento MoM do último período
  - **Card 2:** Minha Posição na Rede — score vs. média do cluster (dados anonimizados)
  - **Card 3:** Ações Pendentes — top 5 ações mais urgentes de todos os módulos
  - **Card 4:** Recomendações — top 3 recomendações geradas por AI Core
  - **Card 5:** Compliance — % conformidade e desvios abertos

#### RF-FRAN-02 — Isolamento de Dados
- O franqueado deve ver **somente** dados da sua própria unidade
- O benchmark deve mostrar médias anonimizadas do cluster — nunca dados individuais de outras unidades
- O isolamento deve ser garantido no backend (CAP `@restrict`), não apenas no frontend

#### RF-FRAN-03 — Ações Pendentes Consolidadas
- O sistema deve agregar em uma única lista as ações pendentes do franqueado de todos os módulos:
  - Tarefas de onboarding (status: Pendente, Vencida)
  - Notificações de compliance com prazo
  - Contratos vencendo em 30 dias
  - Alertas operacionais abertos
- A lista deve ser ordenada por urgência (prazo e severidade)

#### RF-FRAN-04 — Recomendações Geradas por IA
- O sistema deve gerar recomendações personalizadas via SAP AI Core + GenAI Hub
- As recomendações devem ser baseadas em: KPI da unidade, desvios de compliance, comparação com benchmark do cluster
- As recomendações devem ser persistidas e exibidas com contexto explicado (o "por que")
- O franqueado deve poder marcar como Aplicada, Lida ou Descartada
- O job de geração deve rodar diariamente e substituir recomendações antigas do mesmo tipo

#### RF-FRAN-05 — Tendência de Performance
- Ao navegar do card de KPIs, o franqueado deve ver um gráfico de linha com faturamento dos últimos 6 meses
- O gráfico deve incluir a linha de benchmark do cluster para comparação visual

---

### 7.4 Módulo: Onboarding

**Objetivo:** Padronizar e acompanhar o processo de abertura de novas unidades, reduzindo o lead time e o esforço manual.

**Floorplan Fiori:** List Report Object Page com Fiori Draft

#### RF-ONB-01 — Lista de Processos de Onboarding
- A franqueadora deve visualizar todos os processos de onboarding em andamento
- Colunas: Unidade, Franqueado, Etapa Atual, % Conclusão, Previsão de Abertura, Status
- Filtros por status, região, responsável

#### RF-ONB-02 — Processo de Onboarding (Object Page com Draft)
- O processo de onboarding deve ser editável com Draft habilitado (salvar sem submeter)
- O Object Page deve mostrar:
  - Cabeçalho: unidade, % conclusão, status, previsão de abertura
  - Seção Etapas e Tarefas: progresso por etapa com status de cada tarefa
  - Seção Documentos Pendentes: documentos aguardando envio ou aprovação
  - Seção Aprovações em Aberto: aprovações pendentes com responsável

#### RF-ONB-03 — Template de Etapas Configurável
- A franqueadora deve poder configurar o template de etapas do onboarding (ex.: Documentação → Obra → Treinamento → Inauguração)
- O template deve ser aplicado a novos processos sem afetar processos em andamento
- Cada etapa deve ter ordem, prazo estimado e obrigatoriedade configuráveis

#### RF-ONB-04 — Workflow de Aprovação de Documentos
- Ao enviar um documento, um workflow de aprovação deve ser disparado via Build Process Automation
- Se aprovado: próxima tarefa é desbloqueada
- Se rejeitado: franqueado é notificado com motivo e prazo para reenvio
- Aprovações sem resposta no prazo devem escalar para o responsável superior

#### RF-ONB-05 — Visão do Franqueado no Onboarding
- O franqueado em processo de onboarding deve ver suas tarefas pendentes no Portal do Franqueado (card de Ações Pendentes)
- Documentos a enviar, aprovações aguardando e próximas etapas devem ser visíveis

#### RF-ONB-06 — Alertas de Prazo
- Tarefas com prazo vencendo (3 dias antes) e vencidas devem gerar alerta automático
- O alerta deve ir para o responsável pela tarefa e para o gestor do processo na franqueadora

---

## 8. Requisitos Não Funcionais

### 8.1 Segurança e Identidade

| Requisito | Detalhe |
|---|---|
| **Autenticação** | SAP Identity Authentication Service (IAS) para todos os usuários |
| **Autorização** | SAP Authorization & Trust Management (XSUAA) com roles: `Franqueadora_Gestor`, `Franqueado` |
| **Isolamento de dados** | Franqueado acessa somente dados da própria unidade — garantido no backend via CAP `@restrict` |
| **Atributos de usuário** | `unidade_ID` e `cluster` como custom attributes no token JWT (IAS) |
| **Propagação de identidade** | Token JWT propagado para todos os serviços downstream |

### 8.2 Performance

| Requisito | Meta |
|---|---|
| Carregamento do Painel da Rede (ALP, 20 unidades) | < 3 segundos |
| Carregamento do OVP do Franqueado | < 2 segundos |
| Detecção de desvio após INSERT de VendaPraticada | < 5 segundos |
| Recálculo de Score de Saúde | < 3 segundos por unidade |
| Geração de recomendações por AI Core (job diário) | < 60 segundos por unidade |

### 8.3 Escalabilidade

| Requisito | Meta |
|---|---|
| Unidades na rede | Suportar até 1.000 unidades sem degradação |
| Usuários simultâneos | Até 200 franqueados conectados ao mesmo tempo |
| Volume de KPIs | 12 meses de histórico por unidade (240 registros por unidade) |
| Volume de VendaPraticada | Até 500 SKUs por unidade por período |

### 8.4 Disponibilidade e Confiabilidade

| Requisito | Meta |
|---|---|
| Disponibilidade | 99,5% (excluindo janelas de manutenção planejadas) |
| Perda de dados | RPO = 1 hora (SAP HANA Cloud com backup automático) |
| Recuperação | RTO = 4 horas |

### 8.5 Usabilidade

| Requisito | Detalhe |
|---|---|
| **Responsividade** | Todas as telas devem funcionar em dispositivos móveis (browser) |
| **Acessibilidade** | Conformidade com SAP Fiori Design System (WCAG 2.1 AA) |
| **Idioma** | Português (Brasil) como idioma padrão |
| **Theming** | Identidade visual da rede aplicada via SAP UI Theme Designer |

### 8.6 Integrabilidade

| Sistema | Tipo de integração |
|---|---|
| POS/PDV dos franqueados | SAP Integration Suite — iFlow periódico (pull) ou webhook (push) |
| ERP da Franqueadora (S/4HANA) | SAP Integration Suite — dados mestres de produtos e contratos |
| Sistemas legados / planilhas | SAP Integration Suite — CSV upload via API |
| SAP AI Core + GenAI Hub | REST via CAP `cds.connect.to('aicore')` |
| SAP Event Mesh | Publicação de eventos de compliance e alertas |
| SAP Build Process Automation | Workflows de aprovação de documentos |

---

## 9. User Stories

### Franqueadora — Painel da Rede

> **US-NET-01**  
> Como gestora da franqueadora,  
> quero abrir o painel toda segunda-feira e ver imediatamente quais lojas estão em alerta crítico,  
> para que eu possa priorizar ações sem precisar ler relatório nenhum.

> **US-NET-02**  
> Como diretora de expansão,  
> quero filtrar as lojas por cluster e região e ver a performance relativa entre elas,  
> para que eu possa identificar padrões e best practices replicáveis.

> **US-NET-03**  
> Como gestora da franqueadora,  
> quero clicar em uma loja e ver o histórico de KPIs e os alertas de compliance,  
> para que eu tenha contexto completo antes de ligar para o franqueado.

### Franqueadora — Compliance

> **US-COMP-01**  
> Como gestora de compliance,  
> quero ser alertada automaticamente quando uma unidade vende fora da tabela de preços,  
> para que eu não precise depender de auditores presenciais para descobrir desvios.

> **US-COMP-02**  
> Como gestora de compliance,  
> quero ver todos os desvios em aberto filtrados por severidade,  
> para que eu possa priorizar os casos críticos e garantir resposta dentro do prazo.

> **US-COMP-03**  
> Como gestora de compliance,  
> quero que o franqueado seja notificado automaticamente com prazo de correção,  
> para que eu não precise fazer isso manualmente um a um.

### Franqueado

> **US-FRAN-01**  
> Como franqueado,  
> quero ver meu faturamento comparado com a média das lojas do meu cluster,  
> para que eu entenda se estou acima ou abaixo do esperado para o meu perfil de loja.

> **US-FRAN-02**  
> Como franqueado,  
> quero receber recomendações práticas baseadas na minha performance,  
> para que eu saiba o que fazer para melhorar sem precisar ligar para a sede.

> **US-FRAN-03**  
> Como franqueado,  
> quero ver numa tela só tudo o que está pendente — documentos, tarefas, notificações,  
> para que eu não perca prazos por falta de visibilidade.

### Onboarding

> **US-ONB-01**  
> Como gestora de expansão,  
> quero acompanhar o progresso de todas as aberturas em andamento num único painel,  
> para que eu saiba qual processo está em risco de atraso sem precisar ligar para cada franqueado.

> **US-ONB-02**  
> Como franqueado em fase de abertura,  
> quero saber exatamente o que preciso fazer e quando,  
> para que eu consiga abrir minha loja no prazo sem depender de e-mails da sede.

> **US-ONB-03**  
> Como gestora de expansão,  
> quero que a aprovação de documentos seja feita dentro do sistema com prazo controlado,  
> para que o processo não trave por falta de resposta de um aprovador.

---

## 10. Fora do Escopo MVP

As seguintes funcionalidades estão fora do escopo da versão MVP e serão avaliadas para a Fase 2:

| Funcionalidade | Justificativa |
|---|---|
| **Análise de Expansão (score de praças)** | Requer dados históricos de performance por praça — disponível após 12 meses de operação |
| **SAP Analytics Cloud** | Licença adicional; analytics via HANA + Fiori é suficiente para MVP |
| **SAP Datasphere** | Necessário apenas quando há múltiplas fontes heterogêneas a federar |
| **App mobile nativo (MDK)** | Não há requisito de uso offline identificado; PWA responsivo é suficiente |
| **Módulo de royalties** | Integração com sistema financeiro existente é projeto separado |
| **Multi-tenancy** | Cada rede terá seu próprio subaccount no MVP |
| **Gamificação do franqueado** | Ranking, badges, recompensas — fora do foco inicial |
| **Previsão de demanda por IA** | Requer histórico de vendas acumulado — futuro |
| **Deploy via MTA automatizado para Work Zone** | Para o MVP, o registro no Work Zone é feito manualmente; MTA completo é Fase 2 |

---

## 11. Plano de Entregas

### Fase 1 — MVP (até agosto 2026)

| Sprint | Período | Entregável |
|---|---|---|
| Sprint 1 | 29/07 – 04/08 | Backend CAP: schema, serviços, seed data, validação local |
| Sprint 2 | 05/08 – 11/08 | Fiori: ALP Painel da Rede + LROP Compliance + service handler |
| Sprint 3 | 12/08 – 18/08 | OVP Portal do Franqueado + AI Core integration + LROP Onboarding |
| Sprint 4 | 19/08 – 25/08 | Deploy BTP CF + Work Zone + polish + ensaios |
| **Demo** | **26/08** | **Apresentação Dragons' Den** |

### Fase 2 — Expansão (Q4 2026)

| Funcionalidade | Prioridade |
|---|---|
| Módulo de Análise de Expansão (score de praças) | Alta |
| SAP Analytics Cloud para KPIs executivos | Média |
| Deploy MTA automatizado + CDM Work Zone | Alta |
| Integração nativa com S/4HANA (dados mestres) | Alta |
| Notificações push via SAP Build Work Zone | Média |
| Multi-tenancy (múltiplas redes) | Baixa |

### Fase 3 — Produto comercial (2027)

| Funcionalidade | Prioridade |
|---|---|
| SAP Datasphere para federação de dados | Média |
| App mobile nativo (MDK) | Baixa |
| Gamificação e ranking de franqueados | Baixa |
| Previsão de demanda por IA | Média |
| Marketplace de recomendações (SAP Store) | Baixa |

---

## 12. Dependências e Riscos

### Dependências técnicas

| Dependência | Responsável | Status |
|---|---|---|
| Subaccount BTP com HANA Cloud, AI Core, Event Mesh, Integration Suite | Time BTP | ✅ Disponível |
| Instância SAP Build Work Zone | Time BTP | A configurar |
| SAP IAS configurado para a franqueadora | Time BTP | A configurar |
| iFlow de ingestão de dados de POS/ERP | Time Integration | Semana 3 |
| Identidade visual da rede para UI Theme Designer | Cliente/Design | Pós-MVP |

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Demo ao vivo falhar durante apresentação | Baixa | Alto | Testar 3x antes do dia. Plano B: usar dados do seed sem Integration Suite |
| OVP do Franqueado complexa para o prazo | Média | Médio | Simplificar para LROP se necessário; OVP vai para Fase 2 |
| AI Core retornar resposta lenta ou inválida | Média | Médio | Recomendações pré-geradas como fallback; GenAI Hub tem SLA de 10s |
| Formato de dados do POS do cliente incompatível | Alta | Médio | Para demo, usar CSV upload manual; iFlow produtivo é pós-MVP |
| XSUAA/IAS mal configurado no dia da demo | Baixa | Alto | Manter mock users ativos como fallback para o dia da apresentação |

---

## 13. Questões em Aberto

| # | Questão | Impacto | Responsável | Prazo |
|---|---|---|---|---|
| 1 | Qual é a identidade visual da rede para o UI Theme Designer? | Baixo (pós-MVP) | Design | Pós-agosto |
| 2 | O cliente tem POS padronizado ou heterogêneo? | Alto para integração em produção | Arquitetura | Fase 2 |
| 3 | Qual modelo LLM usar no GenAI Hub? (gpt-4o, Claude, Gemini) | Médio — impacta qualidade das recomendações | Time AI | Semana 3 |
| 4 | Quantos SKUs no catálogo real? Impacta performance da detecção | Médio — acima de 10k SKUs precisar otimizar query | Dev | Semana 2 |
| 5 | O franqueado terá acesso a múltiplas unidades? | Alto — impacta o modelo de autenticação JWT | Arquitetura | Antes do deploy |
| 6 | Build Work Zone Standard ou Advanced? | Médio — Advanced suporta mais tipos de card OVP | Time BTP | Semana 4 |
| 7 | Quem gerencia o template de etapas do Onboarding? Apenas admins? | Baixo — mas precisa de role separada | Dev | Semana 2 |

---

*Documento gerado em julho 2026. Próxima revisão prevista após entrega do MVP (agosto 2026).*
