[← README](../../README.md)

# SAC Story Design — Franchise Network Dashboard

**Story name:** `Tropicália Co. — Franchise Network`
**Audience:** Franchisor (HQ) — Carlos Mendes persona
**Layout:** Responsive Page
**Live Connection:** SAP Datasphere | Space `I831004` | Tenant `demo-presaleslad.us10.hcs.cloud.sap`
**Models:** `AM_INVENTORY_JG` · `AM_SELLOUT_JG` · `AM_NPS_JG` · `AM_FORECAST_JG`

---

## Conexão ao Datasphere

1. SAC → **Connections** → **+** → **SAP Datasphere**
2. Tenant URL: `https://demo-presaleslad.us10.hcs.cloud.sap`
3. Space: `I831004`
4. Testar → Salvar

### Adicionar modelos à Story

**Data** (ícone cilindro) → **Add Model** — adicionar os 4:
- `AM_INVENTORY_JG`
- `AM_SELLOUT_JG`
- `AM_NPS_JG`
- `AM_FORECAST_JG`

---

## Filtros Globais (topo do canvas)

| Label | Dimensão | Modelo | Default |
|---|---|---|---|
| Country | COUNTRY_NAME | AM_INVENTORY_JG | All |
| Store | STORE_NAME | AM_INVENTORY_JG | All |
| Period | SNAPSHOT_DATE | AM_INVENTORY_JG | Últimos 30 dias |

> Adicionar filtros por último — após todos os gráficos estarem funcionando.

---

## Banda 1 — KPI Tiles (6 indicadores, linha única)

| # | Label | Medida | Modelo | Filtro adicional | Cor |
|---|---|---|---|---|---|
| 1 | **Revenue at Risk** | SUM(REVENUE_AT_RISK) | AM_INVENTORY_JG | STOCK_STATUS = 'R' | Vermelho |
| 2 | **Critical Stores** | COUNT DISTINCT STORE_ID | AM_INVENTORY_JG | STOCK_STATUS = 'R' | Vermelho |
| 3 | **SKUs at Risk** | COUNT DISTINCT MATNR+COLOR+SIZE | AM_INVENTORY_JG | STOCK_STATUS IN ('R','Y') | Laranja |
| 4 | **Network Sell-out** | SUM(NET_AMOUNT) | AM_SELLOUT_JG | — | Azul |
| 5 | **Network NPS** | AVG(SCORE) | AM_NPS_JG | — | Azul |
| 6 | **Campaign Demand Impact** | MAX(CAMPAIGN_IMPACT_PCT) × 100 | AM_FORECAST_JG | — | Azul |

---

## Banda 2 — Stockout Risk (2 gráficos lado a lado)

### Gráfico A — Store Risk Overview (esquerda, ~60%)
**Tipo:** Tabela com conditional formatting
**Fonte:** AM_INVENTORY_JG | **Ordenação:** REVENUE_AT_RISK desc

| Coluna | Medida/Dimensão | Conditional Formatting |
|---|---|---|
| Store | STORE_NAME | — |
| Country | COUNTRY_NAME | — |
| Critical SKUs | COUNT onde STOCK_STATUS='R' | Vermelho se > 0 |
| At-Risk SKUs | COUNT onde STOCK_STATUS='Y' | Amarelo se > 0 |
| Revenue at Risk | SUM(REVENUE_AT_RISK) | Vermelho se > 0 |
| Days to Stockout | MIN(DAYS_TO_STOCKOUT) | Vermelho se ≤ 3, amarelo se ≤ 7 |
| Status | STOCK_STATUS_LABEL | Ícone semáforo |

### Gráfico B — Revenue at Risk by Store (direita, ~40%)
**Tipo:** Barra horizontal
**Fonte:** AM_INVENTORY_JG
- Eixo X: SUM(REVENUE_AT_RISK)
- Eixo Y: STORE_NAME (ordenado desc por valor)
- Cor: STOCK_STATUS (vermelho=R, amarelo=Y, verde=G)

---

## Banda 3 — Performance & NPS (3 gráficos)

### Gráfico C — Sell-out by Store (esquerda, ~35%)
**Tipo:** Barra vertical | **Fonte:** AM_SELLOUT_JG
- X: STORE_NAME | Y: SUM(NET_AMOUNT)

### Gráfico D — NPS Trend by Store (centro, ~35%)
**Tipo:** Linha | **Fonte:** AM_NPS_JG
- X: SURVEY_DATE (agrupado por semana) | Y: AVG(SCORE)
- Série: STORE_NAME (uma linha por loja)
- Destacar SP Jardins com traço mais espesso

### Gráfico E — Top Articles by Sell-out (direita, ~30%)
**Tipo:** Barra horizontal | **Fonte:** AM_SELLOUT_JG
- X: SUM(NET_AMOUNT) | Y: ARTICLE_NAME (top 8)
- Cor: CATEGORY_NAME

---

## Banda 4 — Demand Forecast (2 gráficos)

### Gráfico F — Forecast vs. Stock by Article (esquerda, ~55%)
**Abordagem:** 2 gráficos adjacentes com filtro vinculado por ARTICLE_NAME
- Barras: SUM(QTY_ON_HAND) — fonte AM_INVENTORY_JG
- Linha: SUM(QTY_FORECAST) — fonte AM_FORECAST_JG
- Quando a linha ultrapassa as barras: risco visual de ruptura

### Gráfico G — Demand Impact Factors (direita, ~45%)
**Tipo:** Barra agrupada | **Fonte:** AM_FORECAST_JG
- X: ARTICLE_NAME (top 5 por REVENUE_AT_RISK)
- Barras agrupadas: WEATHER_IMPACT_PCT × 100, CAMPAIGN_IMPACT_PCT × 100, SEASONALITY_IMPACT_PCT × 100

---

## Banda 5 — SKU Detail Table (rodapé, largura total)

**Tipo:** Tabela expansível | **Fonte:** AM_INVENTORY_JG
**Filtro default:** STOCK_STATUS IN ('R','Y') | **Ordenação:** REVENUE_AT_RISK desc

| Coluna | Campo |
|---|---|
| Store | STORE_NAME |
| Article | ARTICLE_NAME |
| Color | COLOR |
| Size | SIZE_VAL |
| Stock on Hand | QTY_ON_HAND |
| 7-Day Forecast | QTY_FORECAST |
| Shortfall | QTY_SHORTAGE |
| Days to Stockout | DAYS_TO_STOCKOUT |
| Revenue at Risk | REVENUE_AT_RISK |
| Status | STOCK_STATUS_LABEL |

---

## Ordem de Build (recomendada)

1. **KPI tiles** (Banda 1) — valida que os 4 modelos estão conectados
2. **Store Risk table** (Gráfico A) — valida dados de estoque; SP Jardins deve aparecer em vermelho
3. **NPS trend** (Gráfico D) — valida dados de NPS; SP Jardins com curva descendente
4. **Revenue at Risk bar** (Gráfico B) — rápido após Gráfico A
5. **Sell-out charts** (Gráficos C e E)
6. **Forecast charts** (Gráficos F e G) — mais complexos, dois modelos
7. **Detail table** (Banda 5)
8. **Filtros globais** — adicionar por último; testar cascata Country → Store

---

## Valores Esperados Após Build

```sql
CALL "RUNMYFRANCHISE_JG"."P_STOCKOUT_ALERT"('BR-SP-001', '2026-08-11', ?);
```

| Tile / Gráfico | Valor esperado |
|---|---|
| Revenue at Risk (tile) | R$ 125.000 (rede) |
| Critical Stores (tile) | 5 |
| SKUs at Risk (tile) | 87 |
| SP Jardins — Days to Stockout | 2 |
| SP Jardins — Revenue at Risk | R$ 42.500 |
| NPS SP Jardins (mais recente) | 5,4 (era 9,2 em junho) |
| Campaign Impact (tile) | +25% |
| Weather Impact (Gráfico G) | +35% |

---

## Datasphere — Arquitetura de Objetos

```
HANA Cloud (RUNMYFRANCHISE_JG)
  └── CV_DIM_* / CV_FACT_* views
       ↓ Remote Tables (8)
Datasphere Space I831004
  ├── Dimension Views (4)  D_STORE · D_ARTICLE · D_SKU · D_CAMPAIGN
  ├── Fact Views      (4)  F_INVENTORY · F_SELLOUT · F_NPS · F_FORECAST
  └── Analytic Models (4)  AM_INVENTORY_JG · AM_SELLOUT_JG · AM_NPS_JG · AM_FORECAST_JG
```

**Known issue — Remote Tables via CLI:** O CLI salva a definição mas o binding `remote.entity` não é resolvido automaticamente. Após o `datasphere objects remote-tables create`, abrir cada remote table no Data Builder UI e re-selecionar manualmente: Connection → HANA_Generative_Force → Schema → RUNMYFRANCHISE_JG → View → [nome] → Deploy.
