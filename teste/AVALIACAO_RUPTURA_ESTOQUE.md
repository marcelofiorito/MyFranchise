# Avaliação — Caso de foco: Ruptura de Estoque

> Proposta da analista de negócio **Camila**: focar em "como evitar ruptura de estoque na franquia (loja do franqueado)".
> Documento para alinhamento de escopo/prioridade **antes** de investir desenvolvimento.
> Data: 30/07/2026 · Contexto: RunMyFranchise / Dragons' Den 26/08.

---

## 1. Situação atual — estamos tratando isso?

**Não.** Ruptura de estoque **não é um tema tratado** hoje. O que existe é apenas decorativo:

| Onde aparece "estoque" | O que é | Trata ruptura? |
|---|---|---|
| `TipoRecomendacao` código `ESTOQUE` ("Reposição de Estoque") | rótulo de categoria de recomendação | ❌ só um label |
| Recomendações da IA (texto) | gpt-4o às vezes escreve "Reposição prioritária: Vestido Midi..." | ❌ texto genérico, sem dado de estoque por trás |
| `VendaPraticada.qtdVendida` | quantidade vendida por SKU/período | ⚠️ é venda, não saldo de estoque |

**Conclusão:** o sistema não conhece o estoque de nenhum produto. Não há como *evitar* ruptura sem esse dado.

## 2. O que falta no modelo (o gap real)

Não existe nenhuma entidade/campo de:
- **Posição de estoque** por SKU por loja (saldo atual)
- **Estoque mínimo / ponto de reposição**
- **Lead time** de reabastecimento (dias até repor)
- **Cobertura** (dias de estoque restante = saldo ÷ giro diário)
- **Eventos de ruptura** (SKU zerado, venda perdida / lost sales)

## 3. Por que é uma boa escolha de negócio (a favor da Camila)

- **Dor concreta e universal** em franquias: falta produto → venda perdida → franqueado insatisfeito → dano à marca.
- **Visual e mensurável**: "cobertura de 2 dias", "5 SKUs em risco", "R$ X de venda perdida" — ótimo para storytelling de demo.
- **Alinha com o arco atual**: hoje a demo mostra *compliance* (preço). Estoque seria o segundo tipo de risco operacional — reforça a mensagem "a franqueadora enxerga e age".
- **IA ganha caso de uso forte**: recomendar reposição com base em giro + lead time + cobertura é muito mais convincente que texto genérico.

## 4. Esforço estimado (se decidirmos fazer)

A boa notícia: **a arquitetura já suporta** — é o MESMO padrão dos Desvios de Compliance (detecção → criticality → recomendação IA). Reaproveita ~70%.

| Item | Esforço | Reaproveita de |
|---|---|---|
| Entidade `EstoqueUnidade` (SKU, saldo, mínimo, leadTime, cobertura, criticality) | baixo | modelo dos Desvios |
| Seed de dados p/ Loja 147 (alguns SKUs, 1-2 em ruptura) | baixo | CSVs existentes |
| Detecção de ruptura (handler: cobertura < mínimo → alerta/criticality) | médio | `_detectarDesvios` / `_recalcularSaude` |
| App/card "Estoque em Risco" (LR+OP ou card no Portal) | médio | app Compliance / Recomendações |
| IA recomendar reposição com dados reais (ajustar prompt do job) | baixo | `recommendations-job.js` já existe |
| Incluir estoque no Score de Saúde | baixo (opcional) | fórmula do score |

**Ordem de grandeza:** MVP para demo ≈ 1–2 dias; pilar completo ≈ vários dias.

## 5. Opções de escopo (para decidir com o time)

1. **Novo pilar completo** — estoque vira tema central/co-central, modelo e telas completos. Alto impacto, alto custo.
2. **MVP para a narrativa da demo** — entidade enxuta + seed na 147 + 1 tela de "SKUs em risco" + IA recomendando reposição. Vende a história sem completude.
3. **Não fazer para 26/08** — manter o foco atual (rede/compliance/IA/portal, que já estão prontos e validados) e deixar estoque como evolução pós-demo no roadmap.

## 6. Risco de agenda (importante)

Faltam **~4 semanas** para o Dragons' Den (26/08) e os 4 apps + IA já estão **prontos e validados em produção**. Introduzir um pilar novo agora **compete** com o tempo de ensaio da demo (Live Demo Quality = 20% da nota). Recomendação de prudência: se entrar, que seja o **MVP (opção 2)**, com corte claro de escopo, e **só se** houver folga de ensaio. Caso contrário, roadmap.

## 7. Pergunta em aberto para a Camila / time
- Ruptura entra **no lugar de** algum tema atual ou **somado**?
- Para a demo, basta *mostrar SKUs em risco + IA sugerindo reposição*, ou precisa do ciclo completo (pedido de reabastecimento, aprovação)?
- Há dado real de estoque disponível (ERP/fonte) ou seria simulado para a demo?
