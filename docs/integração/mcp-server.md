[← README](../../README.md)

# MCP Server — Referência Técnica

**🇧🇷 Português** · [🇬🇧 English](mcp-server.en.md)

**Versão:** 2.0.0 | **Modelo de dados:** `RUNMYFRANCHISE_JG`

---

## Endpoints

### MCP / Health

| Método | Path | Descrição |
|---|---|---|
| `GET` | `/health` | Status, versão, lista de tools |
| `POST` | `/mcp` | Endpoint MCP (StreamableHTTP) |

### Cards REST (RUNMYFRANCHISE_MF)

Usados pelos UI Integration Cards no SAP Build Work Zone Advanced. Destination: `RunMyFranchise-MCP`.

| Método | Path | Descrição | Persona |
|---|---|---|---|
| `GET` | `/cards/stockout-count` | Contagem de SKUs críticos/atenção da rede | Franqueadora |
| `GET` | `/cards/stockout-alerts` | Lista de SKUs em risco com receita projetada | Franqueadora |
| `GET` | `/cards/nps-avg` | NPS médio da rede | Franqueadora |
| `GET` | `/cards/nps-summary` | NPS por loja com promotores/detratores | Franqueadora |
| `GET` | `/cards/revenue-at-risk-total` | Total de receita em risco | Franqueadora |
| `GET` | `/cards/revenue-at-risk` | Receita em risco agrupada por loja | Franqueadora |
| `GET` | `/cards/my-inventory?store=` | SKUs em risco de uma loja específica (top 6) | Franqueada |
| `GET` | `/cards/my-orders?store=` | Pedidos de reposição de uma loja específica (top 5) | Franqueada |

**Parâmetro `store`:** Store ID (ex: `BR-SP-001`). Default: `BR-SP-001`.

**URL produção:** `https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com`

---

## Health Check

```bash
curl https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com/health
```

Resposta esperada:
```json
{
  "status": "UP",
  "service": "tropicalia-mcp",
  "version": "2.0.0",
  "model": "RUNMYFRANCHISE_JG",
  "tools": ["get_stockout_alert", "get_substitute_suggest", "generate_replenishment_order",
            "get_demand_forecast", "get_nps_analysis", "get_sellout_summary", "get_store_overview"],
  "tool_count": 7
}
```

---

## Tools

### `get_stockout_alert`

Retorna alertas de ruptura da rede Tropicália Co. — SKUs em risco com receita em risco calculada.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `store_id` | string | Não | Store ID (ex: `BR-SP-001`) ou nome (ex: `"SP Jardins"`). Omitir = todas as lojas. |
| `status` | `critical` \| `attention` \| `all` | Não | Filtro de status. Default: `all`. |

**Fonte SQL:** `CV_FACT_INVENTORY WHERE STOCK_STATUS IN ('R','Y')`

---

### `get_substitute_suggest`

Retorna substitutos em estoque para um SKU indisponível numa loja específica.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `store_id` | string | Sim | Store ID ou nome |
| `matnr` | string | Sim | Código do artigo (ex: `TCO-FLIP-001`) ou nome (ex: `"Tucano Flip Flop"`) |
| `color` | string | Sim | Cor (ex: `"Ipanema Blue"`) |
| `size_val` | string | Sim | Tamanho (ex: `"37-38"`) |

**Fonte SQL:** `M_SUBSTITUTE JOIN T_INVENTORY_SNAPSHOT` filtrado por `QTY_ON_HAND > 0`

---

### `generate_replenishment_order`

Gera um pedido de reposição (DRAFT) para todos os SKUs em risco numa loja. Quantidade = shortage + 5 unidades de buffer.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `store_id` | string | Sim | Store ID ou nome |
| `snapshot_date` | string | Não | Data de referência YYYY-MM-DD. Default: `2026-08-11` |

**Fonte SQL:** `CV_FACT_INVENTORY WHERE STOCK_STATUS IN ('R','Y')`

---

### `get_demand_forecast`

Retorna previsão de demanda com fatores de impacto: clima, campanha e sazonalidade.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `store_id` | string | Não | Store ID ou nome. Omitir = rede toda. |
| `matnr` | string | Não | Filtro por artigo (código ou nome). |

**Fonte SQL:** `CV_FACT_FORECAST`

---

### `get_nps_analysis`

Retorna análise de NPS por loja com verbatims de clientes e correlação com ruptura de estoque.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `store_id` | string | Não | Store ID ou nome. Omitir = todas as lojas. |

**Fonte SQL:** `CV_FACT_NPS` + correlação com `CV_FACT_INVENTORY`

---

### `get_sellout_summary`

Retorna resumo de sell-out: faturamento, top artigos e top lojas.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `store_id` | string | Não | Store ID ou nome. Omitir = rede toda. |
| `article` | string | Não | Filtro por artigo (código ou nome). |
| `campaign_id` | string | Não | Filtro por campanha (ex: `CAMP-001`). |

**Fonte SQL:** `CV_FACT_SELLOUT`

---

### `get_store_overview`

Retorna visão 360° de uma loja: estoque, NPS, vendas e previsão de demanda em paralelo.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `store_id` | string | Sim | Store ID ou nome (ex: `"SP Jardins"` ou `"BR-SP-001"`) |

**Fonte SQL:** 5 queries paralelas — `CV_DIM_STORE`, `CV_FACT_INVENTORY`, `CV_FACT_NPS`, `CV_FACT_SELLOUT`, `CV_FACT_FORECAST`

---

## Conexão HANA

O servidor conecta diretamente ao HANA Cloud via `@sap/hana-client` com DBADMIN:

```
Host: 70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com:443
Schema: RUNMYFRANCHISE_JG (read-only cross-schema)
User: DBADMIN
Password: via env var HANA_DBADMIN_PASSWORD (CF: cf set-env)
```

> **Segurança:** A senha nunca deve ser commitada. Configurar via:
> ```bash
> DBPWD='...' && cf set-env myfranchise-mcp HANA_DBADMIN_PASSWORD "$DBPWD"
> ```

---

## Deploy

```bash
# Push standalone (sem mtar)
cf push myfranchise-mcp

# Variáveis de ambiente necessárias
cf set-env myfranchise-mcp PORT 8080
DBPWD='...' && cf set-env myfranchise-mcp HANA_DBADMIN_PASSWORD "$DBPWD"
cf restart myfranchise-mcp
```

O `cf push` usa as configurações do `mta.yaml` (módulo `myfranchise-mcp`):
- Comando: `node srv/mcp-server.js`
- Memory: 256M | Disk: 512M
- Buildpack: `nodejs_buildpack`

---

## Resolução de Loja

A função `resolveStore()` aceita Store ID ou nome parcial:

```
"SP Jardins"    → BR-SP-001
"Buenos Aires"  → AR-BA-001
"BR-SP-001"     → BR-SP-001 (passthrough)
```

Busca por `STORE_NAME LIKE '%input%' OR CITY LIKE '%input%'` na `CV_DIM_STORE`.
