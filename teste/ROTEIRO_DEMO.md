[← README](../README.md)

# Roteiro de Demo — Tropicália Co.

**🇧🇷 Português** · [🇬🇧 English](DEMO_SCRIPT.en.md)

**Dragons' Den: Learn to Win 2026 · 26/08 · ~10 min demo · ao vivo**

> Fio condutor: uma onda de calor + a campanha "Verão Tropical" que começa amanhã colocam 5 de 7 lojas em risco crítico de ruptura. Carlos Mendes (franqueadora) detecta a crise no Work Zone, usa o Joule para analisar e notifica Marina Santos (SP Jardins). Marina recebe o alerta, consulta o Joule e confirma um pedido de reposição inteligente — tudo em menos de 10 minutos.

---

## Personas

| Persona | Papel | Login Work Zone |
|---|---|---|
| **Carlos Mendes** | Head de Operações — Matriz | Acesso a todas as 7 lojas |
| **Marina Santos** | Proprietária — SP Jardins (BR-SP-001) | Acesso somente à própria loja |

---

## Parte 1 — Carlos Mendes (Franqueadora) ~4 min

### Passo 1 — Acessa Work Zone e vê o alerta

Carlos abre o portal Work Zone. Na home page, o card de "Alerta de Ruptura de Estoque" exibe:

| Indicador | Valor |
|---|---|
| Lojas em risco | **5 de 7** |
| SKUs críticos | **87** |
| Receita em risco | **R$ 125.000** |
| Campanha afetada | Verão Tropical (inicia amanhã) |
| Maior risco | SP Jardins — 2 dias para ruptura |

---

### Passo 2 — Analisa no SAC

Carlos clica em "Ver detalhes" → SAC Story "Franchise Network" abre com:

- Mapa de calor: 5 lojas em vermelho
- Tabela de SKUs críticos com drill-down por Artigo → Cor → Tamanho
- Gráfico NPS: SP Jardins caiu de 9,2 para 5,4 nas últimas 6 semanas
- Verbatim em destaque: *"Não encontrei meu tamanho no Chinelo Tucano Azul"*

**Dados SP Jardins (hero):**

| Campo | Valor |
|---|---|
| SKUs críticos | 17 |
| Receita em risco | R$ 42.500 |
| Produto hero | TCO-FLIP-001 Azul Ipanema 37-38 |
| Estoque atual | 3 unidades |
| Previsão de demanda (7d) | 28 unidades |
| Dias para ruptura | **2 dias** |
| NPS médio | 5,4 (era 9,2 em junho) |
| Detratores | 7 de 11 respostas |

---

### Passo 3 — Consulta o Joule

**Prompt Carlos:**
> "Joule, quais lojas têm maior risco de ruptura para a campanha Verão Tropical? Qual é o impacto financeiro?"

**Resposta esperada:**
> "Carlos, identifiquei **5 lojas em situação crítica** para o início da campanha Verão Tropical amanhã:
>
> 🔴 **SP Jardins** (BR-SP-001): 17 SKUs críticos, R$ 42.500 em risco — Chinelo Tucano Azul 37-38 esgota em **2 dias**. NPS caiu 3,8 pontos nas últimas 6 semanas.
> 🔴 **RJ Ipanema**: 14 SKUs críticos, R$ 31.200 em risco
> 🔴 **BH Savassi**: 11 SKUs críticos, R$ 24.800 em risco
> 🟡 **Porto Alegre**: 9 SKUs em atenção, R$ 18.600 em risco
> 🟡 **Buenos Aires**: 8 SKUs em atenção — mas tem 178 unidades excedentes do Tucano Azul, oportunidade de transferência para SP.
>
> **Risco total: R$ 125.000.** Recomendo alertar SP Jardins e RJ Ipanema agora — a janela antes do lançamento fecha hoje."

---

### Passo 4 — Confirma envio do alerta

**Prompt Carlos:**
> "O que eu devo fazer agora?"

**Resposta esperada:**
> "Sugiro duas ações imediatas:
> 1. **Notificar SP Jardins e RJ Ipanema** com as 3 opções de resolução
> 2. **Monitorar Buenos Aires** — a transferência de 20 unidades resolve o problema de lançamento de campanha
>
> Posso preparar e enviar o alerta agora?"

Carlos clica em **"Confirmar e Enviar Alerta"** → notificação enviada para Marina Santos.

---

## Transição (~15s)

> *"Agora vemos a experiência do outro lado — Marina Santos acabou de receber o alerta na loja SP Jardins."*

---

## Parte 2 — Marina Santos (Franqueada SP Jardins) ~5 min

### Passo 5 — Recebe o alerta

Marina recebe notificação no Work Zone:
> "⚠️ Alerta da Matriz: Risco de Ruptura — Campanha Verão Tropical
> 17 SKUs críticos detectados na sua loja | Ação requerida antes de 12/08/2026"

---

### Passo 6 — Analisa no SAC (visão da loja)

Marina clica em "Analisar no Dashboard" → SAC abre filtrado automaticamente para BR-SP-001:
- Chinelo Tucano Azul 37-38 em vermelho: 3 unidades, 2 dias, previsão de 28 vendas
- Correlação NPS × ruptura: queda de NPS acompanha queda de disponibilidade

---

### Passo 7 — Consulta o Joule

**Prompt Marina:**
> "Joule, qual a melhor forma de resolver a ruptura do Chinelo Tucano na minha loja antes da campanha de amanhã?"

**Resposta esperada — 3 opções:**

| Opção | Descrição | Investimento | Cobertura |
|---|---|---|---|
| A | Reposição completa de todos os SKUs | R$ 12.350 | ~100% |
| B | Usar substitutos disponíveis na loja | R$ 0 | ~41% |
| **C ⭐** | **Combinação inteligente** | **R$ 4.200** | **~90%** |

> "Minha recomendação é a **Opção C:**
> 1. Pedido parcial: 12 unidades Tucano Azul 37-38 e 39-40 — entrega 13/08 (1 dia após lançamento)
> 2. Substitutos imediatos na loja: Chinelo Arara Azul Ipanema (95% similaridade, 15 unidades) + Sandália Ipanema Verde Floresta (88%, 8 unidades)
>
> **ROI calculado: 401%** — R$ 16.850 de receita protegida com R$ 4.200 de investimento."

---

### Passo 8 — Confirma o pedido

Marina seleciona Opção C → revisa pedido gerado automaticamente:

| Campo | Valor |
|---|---|
| Número do pedido | SI-2026-008 |
| Loja | BR-SP-001 — SP Jardins |
| Entrega prevista | 2026-08-13 |
| Status | DRAFT (aguardando confirmação) |

| Item | Artigo | Cor | Tamanho | Qtd | Total |
|---|---|---|---|---|---|
| 1 | Chinelo Tucano | Azul Ipanema | 37-38 | 7 | R$ 2.450 |
| 2 | Chinelo Tucano | Azul Ipanema | 39-40 | 5 | R$ 1.750 |
| **Total** | | | | **12** | **R$ 4.200** |

Marina clica em **"Confirmar Pedido"** → status muda para PENDING → matriz recebe confirmação.

---

> *"Em menos de 5 minutos, Marina saiu de uma crise de ruptura para um plano concreto — dados em tempo real, IA como copiloto, 1 clique para agir."*

---

## Checklist Pré-Demo

- [ ] Verificar HANA: `CALL "RUNMYFRANCHISE_JG"."P_STOCKOUT_ALERT"('BR-SP-001', '2026-08-11', ?)`
- [ ] SAC carregado: 5 lojas críticas visíveis, SP Jardins em vermelho
- [ ] Joule respondendo: pergunta de teste "quais lojas têm risco de ruptura hoje?"
- [ ] Work Zone logado como Carlos Mendes (rede toda) — aba 1
- [ ] Work Zone logado como Marina Santos (BR-SP-001) — aba 2
- [ ] Pedido SI-2026-008 não existe ou está em DRAFT (será confirmado ao vivo)

## Prompts de Contingência

| Situação | Prompt alternativo |
|---|---|
| SAC não carrega | "Joule, me dê um resumo das 3 lojas com maior risco de ruptura hoje" |
| Formulário de pedido não abre | "Joule, cria um pedido de 12 unidades do Tucano Azul para SP Jardins" |
| Audiência pergunta sobre BA | "Joule, a Buenos Aires tem estoque para cobrir parte da demanda de SP Jardins?" |
