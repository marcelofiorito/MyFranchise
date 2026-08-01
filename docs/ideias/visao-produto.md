# RunMyFranchise — Visão de Produto Pós-Demo

**Status:** Conceito aprovado — documentação de ideias para execução futura  
**Contexto:** Após a apresentação no Dragons' Den 2026 (26/08), o projeto será reutilizado como ativo de pré-vendas  
**Autor:** Marcelo Fiorito  
**Data:** Agosto 2026

---

## 1. Contexto e Motivação

O RunMyFranchise foi construído para o Dragons' Den 2026. A demo tem 15 minutos, é ao vivo, e foca num roteiro específico com a Loja Porto Alegre (147) e a ruptura de Havaianas no Nordeste.

Após o evento, o projeto tem potencial de se tornar um **ativo de pré-vendas reutilizável** — capaz de demonstrar a proposta de valor para diferentes perfis de compradores (CIO, COO, analista de TI, gestor de negócio) com a mesma narrativa, mas perspectivas diferentes.

O problema das demos tradicionais:
- Dependem do apresentador estar disponível
- São frágeis (rede, ambiente, dados)
- Mostram apenas uma perspectiva por vez
- Não escalam para múltiplos clientes simultaneamente

A visão aqui é construir algo diferente: um **mini mundo de franquias** que roda de forma autônoma, acelerada e controlada, com múltiplas janelas de perspectiva abertas simultaneamente — e que pode ser gravado em vídeo para uso assíncrono.

---

## 2. O Conceito: Demo Orchestrator

Um **motor de simulação** que executa o ciclo completo de negócio de uma rede de franquias de forma acelerada, determinística e repetível.

### O ciclo simulado (em ordem):

```
① Vendas acontecem nas lojas
   → giro de estoque aumenta
   → saldo cai abaixo do ponto crítico

② Agente de Reposição detecta a ruptura
   → calcula cobertura com sazonalidade regional
   → gera pedidos PENDENTE com justificativa do gpt-4o

③ Gestor aprova os pedidos
   → via Joule (linguagem natural) ou app Fiori
   → pedidos mudam para APROVADO

④ Pedido vai ao fornecedor
   → iFlow no Integration Suite dispara evento
   → S/4HANA cria Purchase Order
   → pedidos mudam para ENVIADO

⑤ Entrega chega na loja
   → Goods Receipt no S/4HANA
   → saldo do estoque reposto
   → pedidos mudam para RECEBIDO
   → status do item volta de RUPTURA para OK

⑥ Score de saúde da loja se recupera
   → compliance + performance recalculados
   → dashboards SAC atualizam
   → portal do franqueado reflete a melhora
```

### Controles do motor:

| Botão | Ação |
|---|---|
| **▶ Rodar Ciclo Completo** | Executa as 6 etapas acima em sequência, com delay configurável entre elas |
| **⏸ Pausar** | Para o motor na etapa atual para o apresentador explicar |
| **⏩ Acelerar** | Reduz o delay entre etapas (modo fast-forward para gravação) |
| **🔄 Resetar** | Volta todos os dados ao estado inicial (já implementado no app Admin) |
| **▶ Rodar Etapa** | Executa apenas a próxima etapa do ciclo |

---

## 3. As Perspectivas Simultâneas

A ideia central é mostrar **os mesmos acontecimentos** através de diferentes "janelas", cada uma relevante para um perfil diferente de comprador.

### 3.1 Perspectiva do Gestor da Rede (já existe)
**Sistema:** SAP Build Work Zone + 8 apps Fiori  
**O que muda em tempo real:**
- Tile "Inventory & Replenishment" — contador de itens em ruptura decresce
- Tile "Replenishment Orders" — contador de pedidos pendentes muda
- App Estoque & Reposição — status dos itens muda de RUPTURA → OK
- App Pedidos de Reposição — status evolui PENDENTE → APROVADO → RECEBIDO
- Painel da Rede — score da Loja Porto Alegre (147) sobe conforme desvios são resolvidos

**Perfil do comprador:** COO, Diretor de Operações, Gestor de Franquias

---

### 3.2 Perspectiva do Joule (já existe)
**Sistema:** SAP Joule no Work Zone  
**O que muda em tempo real:**
- O gestor pergunta ao Joule sobre o estado da rede em cada etapa do ciclo
- O Joule responde com dados reais do momento: "6 pedidos pendentes" → "0 pedidos pendentes"
- O Joule aprova pedidos por linguagem natural durante o ciclo

**Perfil do comprador:** qualquer executivo que usa assistente conversacional

---

### 3.3 Perspectiva do Franqueado (já existe parcialmente)
**Sistema:** Portal do Franqueado (OVP — 5 cards)  
**O que muda em tempo real:**
- Card "Meu Estoque" — item em ruptura some da lista
- Card "Score de Saúde" — score da loja sobe de 32 para algo mais alto
- Card "Recomendações da IA" — recomendações geradas para a loja aparecem
- Card "Ações Pendentes" — desvios de compliance são resolvidos

**Perfil do comprador:** franqueado, gerente de loja, diretor regional

---

### 3.4 Perspectiva do Analista de Analytics (a construir)
**Sistema:** SAP Analytics Cloud (SAC)  
**O que muda em tempo real:**
- Story de "Saúde da Rede" — donut de criticidade atualiza (menos lojas em vermelho)
- Story de "Estoque por Região" — barras do NE sobem conforme reposição chega
- Story de "Performance Financeira" — faturamento projetado melhora após estoque reposto
- KPI tiles no SAC — contadores mudam conforme o ciclo avança

**Dependência técnica:**
- Live Connection HANA Cloud (BTP) → SAC — sem replicação, direto no HANA
- Não requer S/4HANA integrado para esta perspectiva
- Modelos analíticos a criar no SAC sobre as entidades do HANA Cloud

**Perfil do comprador:** CFO, CDO, Head of Analytics, equipe de BI

---

### 3.5 Perspectiva do Analista de Banco de Dados (a construir)
**Sistema:** SAP HANA Database Explorer (BTP) ou SAP DBeaver  
**O que muda em tempo real:**
- Tabelas `MYFRANCHISE_ESTOQUE_UNIDADE` — coluna `STATUS_CODE` muda de RUPTURA → OK
- Tabela `MYFRANCHISE_PEDIDOS_REPOSICAO` — coluna `STATUS_CODE` evolui pelo fluxo completo
- Tabela `MYFRANCHISE_SAUDE_UNIDADE` — `SCORESAUDE` da Loja Porto Alegre (147) sobe
- Queries ao vivo provam que os dados são reais — não há mágica, é SQL puro

**Dependência técnica:**
- HANA Explorer já disponível no BTP — zero configuração adicional
- Queries de demonstração a preparar antecipadamente

**Perfil do comprador:** CTO, arquiteto de soluções, DBA, equipe técnica céticа

---

### 3.6 Perspectiva do Integrador (a construir)
**Sistema:** SAP Integration Suite — Monitor de iFlows  
**O que muda em tempo real:**
- iFlow "Goods Movement → BTP" — mostra mensagem processada quando entrega chega
- iFlow "BTP → S/4HANA Purchase Order" — mostra criação da PO após aprovação
- iFlow "CAR → BTP Vendas" — mostra ingestão de dados de venda das lojas
- Message Monitoring — log de cada mensagem com status (Success / Error)

**Dependência técnica:**
- Requer formation BTP + S/4HANA Public Cloud configurada
- iFlows a criar no Integration Suite
- Seed de dados mínimo no S/4HANA (BPs, Plants, materiais)
- É a perspectiva de maior esforço técnico

**Perfil do comprador:** arquiteto de integração, consultor SAP BTP, equipe de TI

---

## 4. Dependências Técnicas por Perspectiva

| Perspectiva | Pré-requisito | Esforço | Prioridade |
|---|---|---|---|
| Gestor da Rede | ✅ Já existe | — | — |
| Joule | ✅ Já existe | — | — |
| Franqueado | ✅ Já existe | — | — |
| Analista de DB | HANA Explorer — já disponível | Baixo | Alta |
| Analista de Analytics (SAC) | Live Connection HANA → SAC | Médio | Alta |
| Integrador (IS + S/4) | Formation BTP+S/4+IS + iFlows + seed S/4 | Alto | Baixa (fase 2) |

---

## 5. Roadmap de Fases

### Fase 1 — Consolidar o que existe (pós Dragons' Den)
- Refinar o motor de simulação no app Admin (botão "Rodar Ciclo Completo")
- Adicionar delay configurável entre etapas
- Preparar queries SQL para a perspectiva do DB analyst
- Gravar vídeos das 3 perspectivas que já existem (Gestor, Joule, Franqueado)

### Fase 2 — SAC como perspectiva de analytics
- Criar Live Connection HANA Cloud BTP → SAC
- Construir modelos analíticos no SAC sobre as entidades do HANA
- Criar 2-3 stories: Saúde da Rede, Estoque por Região, Performance Financeira
- Gravar vídeo da perspectiva SAC sincronizado com o motor de simulação

### Fase 3 — Integração S/4HANA
- Configurar formation BTP + S/4HANA Public Cloud + Integration Suite
- Fazer seed mínimo de dados no S/4HANA (10 BPs, 5 Plants, 20 materiais)
- Criar iFlows para os 3 eventos principais (Goods Movement, PO creation, Sales ingest)
- Gravar vídeo da perspectiva do integrador

### Fase 4 — Demo Orchestrator completo
- Motor de simulação dispara transações reais no S/4HANA (GI, GR, Sales Orders)
- Todas as 6 perspectivas abertas simultaneamente em telas diferentes
- Gravação em split screen (6 janelas)
- Vídeo final editado para uso assíncrono com clientes

---

## 6. O Vídeo como Produto de Pré-Vendas

Cada perspectiva gera um vídeo independente:

| Vídeo | Duração alvo | Público |
|---|---|---|
| "The Network Manager View" | 3 min | COO, Diretor de Operações |
| "The AI Copilot View" (Joule) | 2 min | Executivos, qualquer perfil |
| "The Franchisee View" | 2 min | Franqueado, gerente de loja |
| "The Analytics View" (SAC) | 3 min | CFO, Head of BI |
| "The Database View" | 2 min | CTO, arquiteto |
| "The Integration View" (IS) | 3 min | Arquiteto SAP, equipe TI |
| **"The Full Picture"** (split screen) | **5 min** | **Todos — vídeo âncora** |

O vídeo "The Full Picture" mostra todas as perspectivas simultaneamente — é o vídeo que vai para o site, LinkedIn, email de prospecção. Os vídeos individuais vão para conversas técnicas específicas.

---

## 7. O Motor de Simulação — Implementação

O motor seria uma extensão do app Admin atual. A sequência de passos seria implementada como uma CAP action `rodarCicloCompleto(delay_segundos)` que:

1. Reduz `saldoAtual` de itens selecionados abaixo do `estoqueMinimo` → status RUPTURA
2. Chama `gerarReposicaoTodas()` → Agente gera pedidos PENDENTE
3. Aguarda `delay` segundos (para o apresentador apontar a perspectiva)
4. Chama `aprovarTodosPendentes()` → pedidos → APROVADO
5. Aguarda `delay` segundos
6. Simula envio ao fornecedor → pedidos → ENVIADO
7. Aguarda `delay` segundos
8. Chama `simularRecebimento()` → pedidos → RECEBIDO, estoque reposto
9. Recalcula scores de saúde

O `delay` configurável permite rodar em modo "apresentação ao vivo" (30s entre etapas) ou "gravação acelerada" (3s entre etapas).

---

## 8. Perguntas em Aberto

- **S/4HANA compartilhado:** como isolar os dados de franquias dos outros dados do tenant? Usar um client específico ou prefixar BPs/Plants?
- **SAC:** o tenant SAC atual tem licença para Live Connection com HANA Cloud BTP externo?
- **Gravação:** ferramenta de gravação (Camtasia, OBS, SAP Enable Now?) — qual está disponível?
- **Split screen:** a gravação multi-perspectiva seria feita ao vivo (várias telas) ou editada em pós-produção?
- **Dados do S/4HANA:** os dados de franquias (BPs, materiais, Plants) podem ser criados no tenant compartilhado sem impactar outros usuários?

---

## 9. Próximos Passos Sugeridos

1. **Agora:** salvar este documento e compartilhar com o time
2. **Pós Dragons' Den:** avaliar resultado da demo e decidir investimento na Fase 2
3. **Fase 2:** começar pela Live Connection HANA → SAC — menor esforço, maior impacto visual
4. **Paralelo:** preparar as queries SQL para a perspectiva do DB analyst (custo zero)
5. **Antes da Fase 3:** alinhar com o time de S/4HANA sobre isolamento de dados no tenant compartilhado
