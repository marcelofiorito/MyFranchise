# Roteiro de Demo — RunMyFranchise

**🇧🇷 Português** · [🇬🇧 English](DEMO_SCRIPT.en.md)

**Dragons' Den: Learn to Win 2026 · 26/08 · 15 min demo + 5 min Q&A · ao vivo**

> Fio condutor: a jornada do **Alexandre Mendes** (Diretor de Operações, 280 lojas) descobrindo e resolvendo o problema da **Loja 147 (Porto Alegre, score 32)**. Cada app é um ato. Não é "tour de telas" — é "da dor ao valor em 15 minutos".

---

## Arco narrativo (o "porquê" antes do "o quê")

**Dor (30s de abertura, sem tela):** "Alexandre tem 280 franqueados. Cada um é uma ilha. Os KPIs chegam por planilha, com semanas de atraso. Compliance é auditoria manual. Abrir uma loja leva meses. Ele quer dobrar a rede — mas não enxerga a rede que já tem."

**Virada:** "E se a franqueadora visse a saúde de toda a rede em tempo real, o compliance se detectasse sozinho, a IA sugerisse a ação e o franqueado recebesse tudo mastigado no celular?"

**Resolução:** os 4 apps, terminando no franqueado que recebe a recomendação da IA.

---

## Blocos (timing alvo: 13 min de demo + 2 de folga)

### ATO 1 — Painel da Rede · a visão que não existia (≈3 min)
**App:** Painel da Rede (Gestor)
1. Abrir o app. **Donut de criticidade** na cara: X críticas / Y atenção / Z saudáveis. "Isso é a rede inteira, agora."
2. Frase de valor: *"Antes, isso era uma planilha consolidada no fim do mês. Agora é tempo real e visual."*
3. Filtrar/olhar a tabela → **Loja 147 em vermelho, score 32**. Clicar na linha.
4. Object Page da unidade: dados, score, histórico. "Essa é a nossa loja-problema. Vamos entender por quê."

**Ponto de valor:** visibilidade instantânea da rede · priorização por exceção (o vermelho salta).

### ATO 2 — Compliance · o problema se explica sozinho (≈3 min)
**App:** Governança & Compliance (Gestor)
1. Abrir. Mostrar os **desvios da 147**: Tênis Casual −14,3% (Alta), Boné −24,1% (Alta), Vestido −8,8% (Média), produto não autorizado (Mix/Alta).
2. Frase: *"Ninguém auditou isso à mão. O sistema detectou o desvio de preço no momento da venda"* (mencionar o handler `after CREATE` de VendaPraticada).
3. Mostrar severidade colorida (Alta = vermelho). "A franqueadora já sabe onde apertar."

**Ponto de valor:** compliance automático e proativo · da auditoria manual à detecção em tempo real.

### ATO 3 — IA · da informação à ação (≈3 min) ⭐ clímax
**App:** ainda no Gestor / ou já no Portal
1. "Detectar o problema é metade. A outra metade é: o que fazer?"
2. Acionar / mostrar as **recomendações geradas pelo gpt-4o** (AI Core / GenAI Hub) para a 147: corrigir precificação, reposição, treinamento.
3. Frase-chave: *"Isto não é regra fixa codificada. É um LLM lendo os dados reais da loja e recomendando a ação — rodando dentro do nosso BTP, no AI Core."*
4. (Se for acionar ao vivo: ter o botão/rota pronto e testado; senão, mostrar as 3 já geradas.)

**Ponto de valor:** IA generativa aplicada ao negócio · dado → decisão · roda no AI Core da SAP (governança/dados no BTP).

### ATO 4 — Portal do Franqueado · o valor chega na ponta (≈3 min)
**App:** Portal do Franqueado (login como Roberto / u147)
1. Abrir o dashboard OVP: 5 cards, cada um "**Loja Porto Alegre**".
2. **Minha Performance**: faturamento Jun/2026 R$ 162k... em BRL, com queda visível mês a mês.
3. **Score de Saúde 32** em vermelho · **Ações Pendentes** (severidade colorida) · **Recomendações da IA** (as mesmas do Ato 3, agora na mão do franqueado).
4. Frase de fechamento: *"O franqueado não precisa entender de BI. Ele abre o celular e vê o que fazer hoje. Alta = vermelho. A rede inteira fala a mesma língua."*

**Ponto de valor:** experiência self-service · mesmo dado, papéis diferentes · segurança por atributo (só vê a própria loja).

### FECHAMENTO (≈1 min, sem tela)
- Recapitular a jornada: visão → causa → ação (IA) → execução na ponta.
- 1 frase de arquitetura: *"Tudo em SAP BTP: CAP + HANA Cloud + Fiori + Work Zone + AI Core + Joule. Um dia de trabalho de franqueadora, num único fluxo."*
- Ponte para o roadmap: SAC (analytics avançado), Datasphere, BPA (aprovação automática nível 3).

---

## Ato Bônus — Joule (se sobrar tempo ou Q&A)

*"E se o gestor precisar de uma resposta imediata sem abrir nenhum app?"*

1. Abrir o Joule no Work Zone.
2. Perguntar: **"Quais lojas têm ruptura de Havaianas no Nordeste?"**
3. O Joule aciona `get_lojas_em_risco` em tempo real → resposta com lojas, cobertura em dias vs. lead time.
4. Perguntar: **"Quantos pedidos de reposição estão aguardando aprovação?"**
5. Joule aciona `get_pedidos_pendentes` → lista com loja, produto, quantidade, justificativa do gpt-4o.

**Ponto de valor:** copiloto conversacional com dados reais — sem dashboard, sem filtro, sem tela.

---

## Onboarding (opcional / Q&A)
Se sobrar tempo ou perguntarem sobre expansão: mostrar o app de **Onboarding** (LROP + Draft) — "abrir loja deixa de ser um projeto de meses e vira um processo rastreável com etapas e tarefas."

---

## Checklist de VALIDAÇÃO do roteiro (ensaiar 3x antes do dia)

### Dados batem com a narrativa?
- [ ] Loja 147 aparece vermelha (score 32) no Painel e no Portal
- [ ] Os 4 desvios existem no Compliance com as severidades certas
- [ ] As 3 recomendações da IA existem para a 147 (e o `modo` é "GenAI Hub", não fallback)
- [ ] KPIs jan–jun mostram a queda (189k → 162k)
- [ ] Tile "Estoque & Reposição" mostra número de itens em ruptura
- [ ] Tile "Pedidos de Reposição" mostra número de pedidos PENDENTE
- [ ] Joule responde corretamente "quais lojas têm ruptura de Havaianas no NE?"
- [ ] Joule responde corretamente "quantos pedidos aguardam aprovação?"

### Mecânica ao vivo (o que pode falhar)
- [ ] Login do Gestor E do Franqueado funcionam (logout/login limpo entre eles)
- [ ] Os 7 apps abrem SEM erro no Work Zone (hard refresh antes de começar)
- [ ] Tempo de cold start do srv: **fazer 1 request "de aquecimento" ANTES** (HANA/AI Core têm cold start de segundos)
- [ ] Se for acionar a IA ao vivo: cronometrar (gpt-4o ~2s + parse) e ter as recomendações pré-geradas como rede de segurança
- [ ] Após cada deploy: reatribuir role `MyFranchise_Gestor_DEV` no BTP Cockpit → Security → Users
- [ ] Cronometrar a demo inteira: alvo 13 min

### Plano B (a demo é 20% da nota — proteja-a)
- [ ] Gravar um **vídeo de backup** do fluxo completo (caso a rede/Work Zone caia no dia)
- [ ] Screenshots dos apps salvos localmente
- [ ] Ter um 2º usuário/aba já logada como fallback de sessão
- [ ] Saber reiniciar/reabrir cada app rápido se travar

### Storytelling
- [ ] Cada ato começa com uma FRASE DE DOR e termina com uma FRASE DE VALOR
- [ ] Não narrar a tecnologia enquanto clica ("agora o OData...") — narrar o VALOR
- [ ] Ter 1 número de impacto por ato (280 lojas, −24% de desvio, score 32, 6 pedidos pendentes)
- [ ] Ensaiar as transições entre apps (é onde a demo trava)

---

## Perguntas prováveis do júri (Q&A — 5 min)
- "A IA é confiável?" → roda no AI Core (governança SAP), com **fallback de regras** se o LLM cair — nunca quebra.
- "Escala para 280 lojas?" → HANA Cloud + agregação no banco; o donut usa `$apply`/aggregation nativa.
- "Segurança dos dados do franqueado?" → autorização por atributo (`@restrict`), cada um só vê a própria unidade.
- "Quanto tempo para implementar?" → CAP + Fiori Elements = pouco código, muito por annotation; MVP em semanas.
- "Roadmap?" → SAC, Datasphere, Joule (já citados na arquitetura).
