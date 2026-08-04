[← README](../README.md)

# Roteiro de Demo — RunMyFranchise

**🇧🇷 Português** · [🇬🇧 English](DEMO_SCRIPT.en.md)

**Dragons' Den: Learn to Win 2026 · 26/08 · 15 min demo + 5 min Q&A · ao vivo**

> Fio condutor: **Alexandre Mendes** (Diretor de Operações, 280 lojas) abre o Work Zone e encontra duas crises simultâneas — a Loja Porto Alegre (147) em compliance e ruptura de inverno, e o Nordeste em ruptura de verão. Em 15 minutos, o sistema detectou, a IA recomendou, o agente gerou os pedidos e o Joule aprovou tudo. Zero planilha, zero e-mail, zero auditoria manual.

---

## Arco narrativo

**Dor (30s, sem tela):**
*"Alexandre tem 280 franqueados. Cada um é uma ilha. KPIs chegam por planilha, com semanas de atraso. Compliance é auditoria manual. Quando ele descobre o problema, o dano já está feito. Ele quer dobrar a rede — mas não enxerga a rede que já tem."*

**Virada:**
*"E se o sistema detectasse o problema no momento em que ele acontece, a IA sugerisse a ação, o agente calculasse a reposição com sazonalidade — e o gestor aprovasse tudo pelo celular, em linguagem natural?"*

**Resolução:** 5 atos em 13 minutos — da dor ao valor.

---

## Blocos (timing alvo: 13 min + 2 de folga)

### ATO 1 — Painel da Rede · a visão que não existia (≈2 min)
**App:** Painel da Rede (login Gestor)

1. Abrir. **Donut de criticidade** na cara: lojas Crítico / Atenção / Saudável. *"Isso é a rede inteira, agora."*
2. Filtrar pelo cluster ou ver a tabela → **Loja Porto Alegre (147) em vermelho, score 32**. Clicar na linha.
3. Object Page da unidade. Speech:

> *"Score 32 — vermelho. Por quê? Faturamento caindo mês a mês, 4 desvios de compliance ativos com produto vendido fora do mix autorizado, e um item em ruptura de estoque. Não é um problema isolado — é um padrão. O sistema já sabe. Vamos entender cada camada."*

4. *"Antes, isso era uma planilha consolidada no fim do mês. Agora é tempo real — e o vermelho salta antes do dano ser irreversível."*

**Frase de valor:** *"Priorização por exceção — o score é a soma de compliance, performance e contrato. O gestor não precisa procurar o problema. O problema vem até ele."*

---

### ATO 2 — Compliance · a camada de compliance do score (≈2 min)
**App:** Governança & Compliance (Gestor)

1. Abrir. Filtrar pela **Loja Porto Alegre** (ValueHelp no campo Loja) → **4 desvios**: Tênis −14,3% (Alta), Boné −24,1% (Alta), Vestido −8,8% (Média), produto não autorizado (Mix/Alta).
2. *"Aqui está o compliance baixo que derrubou o score. Ninguém auditou isso à mão — o sistema detectou o desvio de preço no momento da venda, comparou com o catálogo autorizado e registrou automaticamente."*
3. Alta = vermelho. *"40% do score vem do compliance. Com 4 desvios Alta, o impacto é direto no 32."*

**Frase de valor:** *"Da auditoria mensal à detecção em tempo real — o problema não espera o fim do mês para aparecer."*

---

### ATO 3 — Estoque & Reposição · a camada de performance do score (≈3 min) ⭐ clímax técnico
**App:** Estoque & Reposição (Gestor)

1. Abrir. Filtrar por status **RUPTURA** → 5 itens: **3 no NE** (Sandália Feminina — fator sazonal 1,8 em julho) e **2 no Sul** (Calça Jeans Masculina (MR550061), u147 — fator 1,7 no inverno).
2. *"Mesmo produto, mesmo mês — risco oposto por região. A Calça Jeans Masculina (MR550061) da Loja Porto Alegre (147) está em ruptura porque o Sul tem demanda 1,7x no inverno. O agente calcula a cobertura com o fator sazonal de cada região."*
3. *"Ruptura de estoque = venda perdida = faturamento cai = performance cai = score cai. O sistema fechou o ciclo."*
4. Clicar na Calça Jeans Masculina (MR550061) da Loja Porto Alegre (147) → Object Page → aba **Pedidos de Reposição** → pedido gerado pelo gpt-4o com justificativa detalhada.
5. *"O agente não só detectou — ele já calculou a quantidade, sugeriu o fornecedor e escreveu a justificativa. Rodando no AI Core, dentro do BTP."*
6. Mostrar o tile **"Pedidos de Reposição: 6 pendentes"** no launchpad.

**Frase de valor:** *"Do dado à proposta de ação em segundos — sem regra fixa, com raciocínio de IA sobre os dados reais."*

---

### ATO 4 — Joule · aprovação em linguagem natural (≈3 min) ⭐ clímax narrativo
**App:** Joule no Work Zone

1. Abrir o Joule. *"Seis pedidos esperando aprovação. O gestor não precisa abrir nenhum app."*
2. Perguntar: **"Tem pedido de reposição aguardando aprovação?"**
   → Joule lista os 6 pedidos com loja, produto e quantidade.
3. Perguntar: **"Aprova todos os pedidos de Sandália Feminina pendentes"**
   → Joule identifica os IDs, chama `aprovar_pedido` para cada um, confirma: *"6 pedidos aprovados — Fortaleza, Salvador, Recife."*
4. Tile atualiza para **0** em 30 segundos.

**Frase de valor:** *"O gestor fechou o loop de reposição por voz — sem formulário, sem copiar ID, sem abrir app. A IA agiu, o humano aprovou, o sistema executou."*

---

### ATO 5 — Portal do Franqueado · o valor chega na ponta (≈2 min)
**App:** Portal do Franqueado (login Roberto / u147)

1. Abrir o OVP: 5 cards, todos **"Loja Porto Alegre"**.
2. **Minha Performance**: R$ 162k em junho, queda visível mês a mês.
3. **Score 32** em vermelho · **Ações Pendentes** (desvios coloridos) · **Recomendações da IA** (as mesmas geradas no Ato 3 — corrigir precificação, repor estoque, treinar equipe).
4. *"O Roberto não precisa entender de BI. Ele abre o celular e vê o que fazer hoje. Alta = vermelho. A rede inteira fala a mesma língua."*

**Frase de valor:** *"Mesmo dado, papéis diferentes — segurança por atributo, cada franqueado só vê a própria loja."*

---

### FECHAMENTO (≈1 min, sem tela)

*"Em 15 minutos: o gestor viu a rede inteira, detectou o compliance da Loja Porto Alegre (147) no momento da venda, o agente calculou a reposição com sazonalidade regional, o Joule aprovou 6 pedidos por linguagem natural, e o franqueado recebeu a recomendação da IA no celular. Tudo no SAP BTP: CAP + HANA Cloud + AI Core + Work Zone + Joule. Um dia de trabalho de franqueadora, num único fluxo."*

Ponte para roadmap: *"A próxima evolução: SAP Ariba fecha o ciclo de reposição automaticamente — fornecedor confirma envio, loja dá entrada, estoque atualiza. Zero loop humano. É o Agente nível 3."*

---

## Pré-demo — App Admin (5 min antes de entrar no palco)

Abrir o app **Admin** no Work Zone e executar em ordem:

1. **Resetar Demo** → 6 pedidos voltam a PENDENTE · tile mostra 6
2. **Simular Recebimento** → se pedidos estiverem APROVADO, repõe estoque e zera ruptura
3. Verificar KPIs: *Pedidos PENDENTE = 6 · Itens em RUPTURA = 5*
4. Hard refresh no Work Zone
5. Fazer 1 request de aquecimento no backend (HANA e AI Core têm cold start)

---

## Checklist de VALIDAÇÃO (ensaiar 3x antes do dia)

### Dados batem com a narrativa?
- [ ] Loja Porto Alegre (147) aparece vermelha (score 32) no Painel e no Portal
- [ ] 4 desvios da Loja Porto Alegre (147) no Compliance com severidades certas (2 Alta, 1 Média, 1 Mix)
- [ ] Calça Jeans Masculina (MR550061) da Loja Porto Alegre (147) aparece em RUPTURA no Estoque
- [ ] 3 itens NE + 2 Sul em RUPTURA (total 5)
- [ ] Tile "Pedidos de Reposição" mostra 6 PENDENTE
- [ ] Tile "Estoque & Reposição" mostra 5 em RUPTURA
- [ ] Recomendações da Loja Porto Alegre (147) existem (modo `"GenAI Hub"`, não fallback)
- [ ] KPIs jan–jun mostram a queda (189k → 162k)

### Joule funciona?
- [ ] *"Tem pedido de reposição aguardando aprovação?"* → lista os 6
- [ ] *"Aprova todos os pedidos de Sandália Feminina pendentes"* → aprovação confirmada
- [ ] *"Quais lojas têm ruptura de Sandália Feminina no NE?"* → lista NE com cobertura vs lead time

### Mecânica ao vivo
- [ ] Login do Gestor E do Franqueado funcionam (logout/login limpo entre eles)
- [ ] Os 8 apps abrem SEM erro no Work Zone
- [ ] Após cada deploy: reatribuir role `MyFranchise_Gestor_DEV` no Cockpit → Security → Users
- [ ] Cronometrar a demo inteira: alvo 13 min

### Plano B
- [ ] Gravar **vídeo de backup** do fluxo completo antes do dia
- [ ] Screenshots dos 5 atos salvos localmente
- [ ] 2ª aba já logada como fallback de sessão
- [ ] App Admin acessível para reset rápido se algo travar

### Storytelling
- [ ] Cada ato: FRASE DE DOR no início + FRASE DE VALOR no final
- [ ] Nunca narrar a tecnologia enquanto clica — narrar o VALOR
- [ ] 1 número de impacto por ato: 280 lojas / −24% desvio / 5 em ruptura / 6 aprovados / score 32
- [ ] Ensaiar as transições entre apps (é onde a demo trava)

---

## Perguntas prováveis do júri (Q&A — 5 min)

- **"A IA é confiável?"** → roda no AI Core (governança SAP), com fallback de regras determinísticas se o LLM cair — nunca quebra.
- **"Escala para 280 lojas?"** → HANA Cloud + agregação nativa no banco; o donut usa `$apply` com `groupby`. CAP gerencia a camada de serviço.
- **"Segurança dos dados do franqueado?"** → autorização por atributo JWT (`@restrict where unidade_ID = $user.unidade_ID`) — cada franqueado só vê a própria loja, no token.
- **"Quanto tempo para implementar?"** → CAP + Fiori Elements = muito por annotation, pouco código. O MVP deste projeto foi construído em semanas.
- **"O que acontece depois que o pedido é aprovado?"** → hoje vai para APROVADO e segue para o fornecedor. A próxima evolução é integração com SAP Ariba: fornecedor confirma envio → ENVIADO; loja dá entrada → RECEBIDO, estoque atualiza automaticamente. É o Agente nível 3.
- **"O Joule substitui os apps?"** → complementa. Apps para análise detalhada, Joule para decisão rápida em mobilidade — aprovar 6 pedidos em 30 segundos sem abrir nenhuma tela.
- **"Roadmap?"** → SAC (analytics executivo), Datasphere (federação PDV+ERP), SAP Ariba (ciclo de reposição fechado), BPA (aprovação automática por regra), S/4HANA Retail (demanda em tempo real).

---

## Onboarding (opcional / se perguntarem sobre expansão)

*"Abrir loja deixa de ser um projeto de meses e vira um processo rastreável."* Mostrar o app Onboarding (LROP + Draft) — etapas, tarefas, responsável, prazo. Draft salva o progresso automaticamente.


---

[← Voltar ao README](../README.md)
