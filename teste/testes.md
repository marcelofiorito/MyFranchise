[← README](../README.md)

# Perguntas de Teste — Joule / MCP Tools

**🇧🇷 Português** · [🇬🇧 English](tests.en.md)

> Use estas perguntas para validar as 7 tools do MCP Server antes da demo.
> Cada pergunta indica qual tool deve ser acionada e o que verificar na resposta.

---

## `get_store_overview`

| # | Pergunta | O que verificar na resposta |
|---|---|---|
| 1 | "Give me a full overview of SP Jardins." | Store BR-SP-001, NPS 5.4, SKUs críticos, receita em risco |
| 2 | "What is the situation at the Buenos Aires store?" | Store AR-BA-001, estoque excedente Tucano |
| 3 | "How is our Miami store doing?" | Store US-MIA-001, vendas, NPS |
| 4 | "Tell me about BR-MG-001." | BH Savassi — aceita Store ID direto |

---

## `get_stockout_alert`

| # | Pergunta | O que verificar |
|---|---|---|
| 5 | "Which stores have critical stockout risks right now?" | 5 lojas críticas, receita total ~R$ 125.000 |
| 6 | "What is the inventory status across the network?" | Retorna críticos + atenção, resumo por loja |
| 7 | "Show me all SKUs at critical level." | Apenas STOCK_STATUS = 'R', ordenado por receita |
| 8 | "What products are running low at SP Jardins?" | Somente BR-SP-001, TCO-FLIP-001 em destaque |

---

## `get_nps_analysis`

| # | Pergunta | O que verificar |
|---|---|---|
| 9 | "Why did the NPS drop at SP Jardins?" | Score 5.4, 7 detratores, verbatims sobre Tucano |
| 10 | "What are customers complaining about?" | Verbatims negativos, categoria ruptura |
| 11 | "Show me the NPS scores for all stores." | Tabela com todas as lojas, SP Jardins mais baixo |

---

## `get_demand_forecast`

| # | Pergunta | O que verificar |
|---|---|---|
| 12 | "What is the demand forecast for the Tucano Flip Flop?" | TCO-FLIP-001, multiplicador de demanda, dias para ruptura |
| 13 | "How does the heat wave affect demand this week?" | `weather_impact_pct` +35%, demanda SP |
| 14 | "Which SKUs will run out first given the Tropical Summer campaign?" | SKUs com menor `days_to_stockout`, `campaign_impact_pct` +25% |

---

## `get_substitute_suggest`

| # | Pergunta | O que verificar |
|---|---|---|
| 15 | "A customer wants Tucano Flip Flop in Ipanema Blue size 37-38 but we're out. What can I offer?" | Arara Azul (95% similaridade), Sandália Verde (88%), script de venda |
| 16 | "What substitutes are available for the Tucano at SP Jardins?" | Lista com `qty_available` > 0 em BR-SP-001 |

---

## `generate_replenishment_order`

| # | Pergunta | O que verificar |
|---|---|---|
| 17 | "Create a replenishment order for SP Jardins." | Pedido DRAFT com linhas de item, custo total, status "awaiting confirmation" |
| 18 | "How much would it cost to replenish all at-risk SKUs at SP Jardins?" | Custo total calculado, qty = shortage + 5 buffer |

---

## `get_sellout_summary`

| # | Pergunta | O que verificar |
|---|---|---|
| 19 | "What is our total network revenue so far?" | SUM de todas as lojas, top artigos |
| 20 | "Which article is selling the most across all stores?" | Top 5 por receita |
| 21 | "How is the Tropical Summer campaign performing in terms of sales?" | Filtrado por CAMP-2026-001 |

---

## Perguntas multi-tool (hero story)

| # | Pergunta | Tools acionadas |
|---|---|---|
| 22 | "SP Jardins NPS is at 5.4 and we have a stockout. What should I do?" | `get_nps_analysis` + `get_stockout_alert` + `get_substitute_suggest` |
| 23 | "Give me everything I need to know about SP Jardins before the campaign tomorrow." | `get_store_overview` |

---

## Checklist de Validação

Para cada resposta, verificar:
- [ ] Tool correta foi acionada (sem respostas "da memória" do modelo)
- [ ] Dados reais do HANA retornados (não valores fictícios)
- [ ] Store IDs e nomes reconhecidos corretamente (SP Jardins = BR-SP-001)
- [ ] Emojis de status presentes: 🔴 Critical, 🟡 Attention, 🟢 OK
- [ ] Resposta no idioma da pergunta (PT ou EN)
