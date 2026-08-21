[← README](../README.en.md)

# Test Questions — Joule / MCP Tools

[🇧🇷 Português](testes.md) · **🇬🇧 English**

> Use these questions to validate all 7 MCP Server tools before the demo.
> Each question indicates which tool should be triggered and what to verify in the response.

---

## `get_store_overview`

| # | Question | What to verify |
|---|---|---|
| 1 | "Give me a full overview of SP Jardins." | Store BR-SP-001, NPS 5.4, critical SKUs, revenue at risk |
| 2 | "What is the situation at the Buenos Aires store?" | Store AR-BA-001, Tucano surplus stock |
| 3 | "How is our Miami store doing?" | Store US-MIA-001, sales, NPS |
| 4 | "Tell me about BR-MG-001." | BH Savassi — accepts direct Store ID |

---

## `get_stockout_alert`

| # | Question | What to verify |
|---|---|---|
| 5 | "Which stores have critical stockout risks right now?" | 5 critical stores, total revenue ~R$ 125,000 |
| 6 | "What is the inventory status across the network?" | Critical + attention, summary by store |
| 7 | "Show me all SKUs at critical level." | STOCK_STATUS = 'R' only, sorted by revenue |
| 8 | "What products are running low at SP Jardins?" | BR-SP-001 only, TCO-FLIP-001 highlighted |

---

## `get_nps_analysis`

| # | Question | What to verify |
|---|---|---|
| 9 | "Why did the NPS drop at SP Jardins?" | Score 5.4, 7 detractors, verbatims about Tucano |
| 10 | "What are customers complaining about?" | Negative verbatims, stockout category |
| 11 | "Show me the NPS scores for all stores." | Table with all stores, SP Jardins lowest |

---

## `get_demand_forecast`

| # | Question | What to verify |
|---|---|---|
| 12 | "What is the demand forecast for the Tucano Flip Flop?" | TCO-FLIP-001, demand multiplier, days to stockout |
| 13 | "How does the heat wave affect demand this week?" | `weather_impact_pct` +35%, São Paulo demand |
| 14 | "Which SKUs will run out first given the Tropical Summer campaign?" | Lowest `days_to_stockout`, `campaign_impact_pct` +25% |

---

## `get_substitute_suggest`

| # | Question | What to verify |
|---|---|---|
| 15 | "A customer wants Tucano Flip Flop in Ipanema Blue size 37-38 but we're out. What can I offer?" | Arara Blue (95% similarity), Ipanema Sandal Green (88%), sales script |
| 16 | "What substitutes are available for the Tucano at SP Jardins?" | List with `qty_available` > 0 at BR-SP-001 |

---

## `generate_replenishment_order`

| # | Question | What to verify |
|---|---|---|
| 17 | "Create a replenishment order for SP Jardins." | DRAFT order with line items, total cost, status "awaiting confirmation" |
| 18 | "How much would it cost to replenish all at-risk SKUs at SP Jardins?" | Total cost calculated, qty = shortage + 5 buffer |

---

## `get_sellout_summary`

| # | Question | What to verify |
|---|---|---|
| 19 | "What is our total network revenue so far?" | SUM across all stores, top articles |
| 20 | "Which article is selling the most across all stores?" | Top 5 by revenue |
| 21 | "How is the Tropical Summer campaign performing in terms of sales?" | Filtered by CAMP-2026-001 |

---

## Multi-tool questions (hero story)

| # | Question | Tools triggered |
|---|---|---|
| 22 | "SP Jardins NPS is at 5.4 and we have a stockout. What should I do?" | `get_nps_analysis` + `get_stockout_alert` + `get_substitute_suggest` |
| 23 | "Give me everything I need to know about SP Jardins before the campaign tomorrow." | `get_store_overview` |

---

## Validation Checklist

For each response, verify:
- [ ] Correct tool was triggered (no responses "from model memory")
- [ ] Real HANA data returned (not fictional values)
- [ ] Store IDs and names resolved correctly (SP Jardins = BR-SP-001)
- [ ] Status emojis present: 🔴 Critical, 🟡 Attention, 🟢 OK
- [ ] Response in the same language as the question (PT or EN)
