[← README](../README.en.md)

# Demo Script — Tropicália Co.

[🇧🇷 Português](ROTEIRO_DEMO.md) · **🇬🇧 English**

**Dragons' Den: Learn to Win 2026 · Aug 26 · ~10 min demo · live**

> A heat wave plus the "Tropical Summer" campaign launching tomorrow put 5 of 7 stores at critical stockout risk. Carlos Mendes (franchisor HQ) detects the crisis in Work Zone, uses Joule to analyze it, and notifies Marina Santos (SP Jardins). Marina receives the alert, asks Joule for a recommendation, and confirms a smart replenishment order — all in under 10 minutes.

---

## Personas

| Persona | Role | Work Zone Login |
|---|---|---|
| **Carlos Mendes** | Head of Operations — HQ | Access to all 7 stores |
| **Marina Santos** | Owner — SP Jardins (BR-SP-001) | Own store only |

---

## Part 1 — Carlos Mendes (Franchisor HQ) ~4 min

### Step 1 — Opens Work Zone and sees the alert

Carlos opens the Work Zone portal. The "Stockout Risk Alert" card on the home page shows:

| Indicator | Value |
|---|---|
| Stores at risk | **5 of 7** |
| Critical SKUs | **87** |
| Revenue at risk | **R$ 125,000** |
| Affected campaign | Tropical Summer (starts tomorrow) |
| Highest risk | SP Jardins — 2 days to stockout |

---

### Step 2 — Analyzes in SAC

Carlos clicks "View Details" → SAC Story "Franchise Network" opens with:

- Heat map: 5 stores in red
- Critical SKU table with drill-down by Article → Color → Size
- NPS trend: SP Jardins dropped from 9.2 to 5.4 over the last 6 weeks
- Featured verbatim: *"Couldn't find my size in the Tucano Blue flip-flop"*

**SP Jardins (hero store) details:**

| Field | Value |
|---|---|
| Critical SKUs | 17 |
| Revenue at risk | R$ 42,500 |
| Hero product | TCO-FLIP-001 Ipanema Blue 37-38 |
| Current stock | 3 units |
| 7-day demand forecast | 28 units |
| Days to stockout | **2 days** |
| NPS average | 5.4 (was 9.2 in June) |
| Detractors | 7 of 11 responses |

---

### Step 3 — Asks Joule

**Carlos's prompt:**
> "Joule, which stores have the highest stockout risk for the Tropical Summer campaign? What is the financial impact?"

**Expected response:**
> "Carlos, I identified **5 stores in critical condition** ahead of the Tropical Summer campaign launching tomorrow:
>
> 🔴 **SP Jardins** (BR-SP-001): 17 critical SKUs, R$ 42,500 at risk — Tucano Blue 37-38 runs out in **2 days**. NPS dropped 3.8 points over the last 6 weeks.
> 🔴 **RJ Ipanema**: 14 critical SKUs, R$ 31,200 at risk
> 🔴 **BH Savassi**: 11 critical SKUs, R$ 24,800 at risk
> 🟡 **Porto Alegre**: 9 attention SKUs, R$ 18,600 at risk
> 🟡 **Buenos Aires**: 8 attention SKUs — but has 178 surplus units of Tucano Blue, a transfer opportunity to SP.
>
> **Total network risk: R$ 125,000.** I recommend alerting SP Jardins and RJ Ipanema now — the window before campaign launch closes today."

---

### Step 4 — Confirms sending the alert

**Carlos's prompt:**
> "What should I do right now?"

**Expected response:**
> "Two immediate actions:
> 1. **Alert SP Jardins and RJ Ipanema** with the 3 resolution options
> 2. **Monitor Buenos Aires** — a transfer of 20 units covers the campaign launch window
>
> Shall I prepare and send the alert now?"

Carlos clicks **"Confirm and Send Alert"** → push notification sent to Marina Santos.

---

## Transition (~15s)

> *"Now let's see the other side — Marina Santos just received the alert at SP Jardins."*

---

## Part 2 — Marina Santos (Franchisee SP Jardins) ~5 min

### Step 5 — Receives the alert

Marina receives a Work Zone notification:
> "⚠️ HQ Alert: Stockout Risk — Tropical Summer Campaign
> 17 critical SKUs detected at your store | Action required before 2026-08-12"

---

### Step 6 — Analyzes in SAC (store view)

Marina clicks "Analyze in Dashboard" → SAC opens automatically filtered to BR-SP-001:
- Tucano Blue 37-38 in red: 3 units, 2 days, 28 units forecasted
- NPS × stockout correlation: NPS decline tracks stock availability

---

### Step 7 — Asks Joule

**Marina's prompt:**
> "Joule, what is the best way to solve the Tucano stockout at my store before tomorrow's campaign?"

**Expected response — 3 options:**

| Option | Description | Investment | Coverage |
|---|---|---|---|
| A | Full replenishment of all critical SKUs | R$ 12,350 | ~100% |
| B | Use in-stock substitutes only | R$ 0 | ~41% |
| **C ⭐** | **Smart combination** | **R$ 4,200** | **~90%** |

> "My recommendation is **Option C:**
> 1. Partial order: 12 units of Tucano Blue 37-38 and 39-40 — delivery Aug 13 (1 day after launch)
> 2. Immediate in-store substitutes: Arara Flip Flop Ipanema Blue (95% similarity, 15 units) + Ipanema Sandal Forest Green (88%, 8 units)
>
> **Calculated ROI: 401%** — R$ 16,850 in protected revenue from a R$ 4,200 investment."

---

### Step 8 — Confirms the order

Marina selects Option C → reviews the auto-generated order:

| Field | Value |
|---|---|
| Order number | SI-2026-008 |
| Store | BR-SP-001 — SP Jardins |
| Expected delivery | 2026-08-13 |
| Status | DRAFT (awaiting confirmation) |

| Item | Article | Color | Size | Qty | Total |
|---|---|---|---|---|---|
| 1 | Tucano Flip Flop | Ipanema Blue | 37-38 | 7 | R$ 2,450 |
| 2 | Tucano Flip Flop | Ipanema Blue | 39-40 | 5 | R$ 1,750 |
| **Total** | | | | **12** | **R$ 4,200** |

Marina clicks **"Confirm Order"** → status changes to PENDING → HQ receives confirmation.

---

> *"In under 5 minutes, Marina went from a stockout crisis to a concrete action plan — live data, AI co-pilot, one click to act."*

---

## Pre-Demo Checklist

- [ ] Verify HANA: `CALL "RUNMYFRANCHISE_JG"."P_STOCKOUT_ALERT"('BR-SP-001', '2026-08-11', ?)`
- [ ] SAC loaded: 5 critical stores visible, SP Jardins in red
- [ ] Joule responding: test question "which stores have stockout risk today?"
- [ ] Work Zone logged in as Carlos Mendes (all stores) — Tab 1
- [ ] Work Zone logged in as Marina Santos (BR-SP-001 only) — Tab 2
- [ ] Order SI-2026-008 does not exist yet or is in DRAFT status

## Contingency Prompts

| Situation | Fallback prompt |
|---|---|
| SAC does not load | "Joule, give me a summary of the 3 stores with the highest stockout risk today" |
| Order form does not open | "Joule, create a replenishment order for 12 units of Tucano Blue for SP Jardins" |
| Audience asks about BA | "Joule, does Buenos Aires have enough stock to cover part of SP Jardins' demand?" |
