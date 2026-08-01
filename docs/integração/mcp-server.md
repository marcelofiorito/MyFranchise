# RunMyFranchise — MCP Server (Joule)

**🇧🇷 Português** · [🇬🇧 English](mcp-server.en.md)

> **Versão:** 1.0 · Agosto 2026  
> **Status:** ✅ Em produção — Cloud Foundry, us10  
> **URL:** `https://joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com`  
> **Health check:** `GET /health`

---

## 1. Visão Geral

O MCP Server do RunMyFranchise é um servidor **Python FastMCP** que expõe 7 tools para o SAP Joule. Ele atua como ponte entre o copiloto conversacional e a API OData do `myfranchise-srv`, permitindo que gestores realizem consultas e aprovações de pedidos de reposição em linguagem natural.

**Fluxo validado em produção:**
> *"Aprova todos os pedidos de Havaianas pendentes"* → Joule chama `get_pedidos_pendentes()`, identifica os IDs, chama `aprovar_pedido()` para cada um → 6 pedidos aprovados end-to-end.

**Arquivo fonte:** `docs/integração/mcp_server_cf.py`

---

## 2. Arquitetura

```
SAP Joule (Work Zone)
      │
      │  MCP Protocol (StreamableHTTP)
      ▼
joule-myfranchise-mcp (CF App — Python FastMCP)
      │
      │  OAuth2 Bearer Token (XSUAA client_credentials)
      │  + CSRF Token (x-csrf-token Fetch → POST)
      ▼
myfranchise-srv (CF App — SAP CAP Node.js)
      │
      ├── GET  /franqueadora/Estoque_Unidade
      ├── GET  /franqueadora/Pedidos_Reposicao
      ├── GET  /franqueadora/Recomendacoes
      ├── GET  /franqueadora/Saude_Dashboard
      ├── GET  /franqueadora/Unidades
      ├── POST /franqueadora/Pedidos_Reposicao(ID=...)/FranqueadoraService.aprovar
      └── POST /franqueadora/Pedidos_Reposicao(ID=...)/FranqueadoraService.recusar
```

---

## 3. Variáveis de Ambiente (cf set-env)

| Variável | Descrição | Exemplo |
|---|---|---|
| `SRV_URL` | URL do myfranchise-srv | `https://sa-build-platform-org-dev-myfranchise-srv.cfapps.us10.hana.ondemand.com` |
| `TOKEN_URL` | Endpoint OAuth2 do XSUAA | `https://<tenant>.authentication.us10.hana.ondemand.com/oauth/token` |
| `CLIENT_ID` | `clientid` do XSUAA | `sb-myfranchise-...` |
| `CLIENT_SECRET` | `clientsecret` do XSUAA | `...` |
| `PORT` | Porta HTTP (CF injeta automaticamente) | `8080` |
| `MES_REFERENCIA` | Mês de referência sazonal (1–12) | `7` (julho) |
| `CF_HOST` | Host CF para DNS rebinding protection | `joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com` |

---

## 4. Autenticação

### Leitura (GET)
O servidor obtém um Bearer token via **OAuth2 `client_credentials`** do XSUAA. O token é cacheado por ~58 minutos (renovado 30 segundos antes de expirar).

```python
POST {TOKEN_URL}
Authorization: Basic {CLIENT_ID}:{CLIENT_SECRET}
Body: grant_type=client_credentials
```

### Escrita (POST — aprovar/recusar)
Além do Bearer token, o CAP exige **CSRF token** para POSTs no OData V4:

```python
# 1. Fetch CSRF token
GET {SRV_URL}/franqueadora/
Headers: x-csrf-token: Fetch, Authorization: Bearer {token}
→ Response: x-csrf-token: {csrf_value}

# 2. Usar o CSRF no POST
POST {SRV_URL}/franqueadora/Pedidos_Reposicao(ID={id})/FranqueadoraService.aprovar
Headers: x-csrf-token: {csrf_value}, Authorization: Bearer {token}
Body: { "qtdAprovada": 120, "observacao": "Aprovado urgente" }
```

---

## 5. Tools Disponíveis

### Tool 1 — `get_lojas_em_risco`
Lista lojas com risco de ruptura de estoque (`estoqueCriticality < 3`), considerando sazonalidade regional.

**Parâmetros:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `regiao` | `str` | Não | Código da região: `NE`, `S`, `SE`, `CO`, `N` |
| `categoria` | `str` | Não | Nome da categoria (ex: `Sandálias`) |

**Exemplo:**
```
get_lojas_em_risco(regiao='NE', categoria='Sandálias')
```

**Retorno:**
```json
{
  "total": 2,
  "mes_referencia": 7,
  "lojas": [
    {
      "loja": "Loja Recife",
      "cidade": "Recife",
      "regiao": "NE",
      "produto": "Havaianas Top",
      "saldo": 45,
      "coberturaDias": 2.6,
      "leadTime": 7,
      "criticidade": "RUPTURA IMINENTE"
    }
  ]
}
```

---

### Tool 2 — `get_cobertura_estoque`
Retorna cobertura de estoque em dias de uma loja, com sazonalidade regional aplicada.

**Parâmetros:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `unidade_id` | `str` | Sim | ID da unidade (ex: `u178`) |
| `sku` | `str` | Não | Código do SKU (ex: `SKU-100`) |

**Exemplo:**
```
get_cobertura_estoque(unidade_id='u147')
get_cobertura_estoque(unidade_id='u178', sku='SKU-100')
```

---

### Tool 3 — `get_pedidos_pendentes`
Lista pedidos de reposição aguardando aprovação (status `PENDENTE`).

**Parâmetros:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `unidade_id` | `str` | Não | Filtra por loja (ex: `u147`) |

**Retorno:** Lista com `id`, `loja`, `cidade`, `produto`, `sku`, `qtdSugerida`, `fornecedor`, `prazo`, `justificativa`.

> **REGRA:** Sempre chame `get_pedidos_pendentes()` antes de `aprovar_pedido()` se não tiver o UUID do pedido.

---

### Tool 4 — `get_recomendacoes`
Retorna recomendações geradas pelo gpt-4o (status `NOVA`).

**Parâmetros:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `unidade_id` | `str` | Não | ID da unidade |
| `prioridade` | `str` | Não | `ALTA`, `MEDIA` ou `BAIXA` |

---

### Tool 5 — `get_score_rede`
Retorna o score de saúde das lojas da rede com resumo agregado.

**Parâmetros:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `regiao` | `str` | Não | Filtro por região |
| `somente_criticas` | `bool` | Não | `True` para lojas com score < 45 |

**Retorno inclui:** `resumo_rede` (total, críticas, atenção, saudáveis, scoreMedia) + lista de lojas.

---

### Tool 6 — `aprovar_pedido`
Aprova um pedido de reposição. O status muda de `PENDENTE` para `APROVADO`.

**Parâmetros:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `pedido_id` | `str` | Sim | UUID do pedido (obtido via `get_pedidos_pendentes`) |
| `qtd_aprovada` | `int` | Não | Quantidade aprovada (`0` = usa qtdSugerida do agente) |
| `observacao` | `str` | Não | Comentário do gestor |

**Exemplo:**
```
aprovar_pedido(pedido_id='3b5e1f9a-...', qtd_aprovada=120, observacao='Aprovado urgente NE')
```

**Endpoint CAP chamado:**
```
POST /franqueadora/Pedidos_Reposicao(ID={pedido_id})/FranqueadoraService.aprovar
```

---

### Tool 7 — `recusar_pedido`
Recusa um pedido de reposição. O status muda de `PENDENTE` para `RECUSADO`.

**Parâmetros:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `pedido_id` | `str` | Sim | UUID do pedido |
| `motivo` | `str` | Não | Motivo da recusa (recomendado para histórico) |

**Exemplo:**
```
recusar_pedido(pedido_id='3b5e1f9a-...', motivo='Estoque já reposto por outra via')
```

---

## 6. Sazonalidade Regional

O MCP Server considera sazonalidade nos cálculos de cobertura (via entidade `Sazonalidade_Regional` no CAP). O parâmetro `MES_REFERENCIA` define o mês de referência para os fatores sazonais.

**Exemplo — Havaianas em julho:**
| Região | Fator sazonal | Cobertura calculada (saldo=45, giro=17/dia) |
|---|---|---|
| Nordeste | 1,8× | 45 / (17 × 1,8) = **1,5 dias** 🔴 RUPTURA |
| Sul | 0,4× | 45 / (17 × 0,4) = **6,6 dias** 🟡 ATENÇÃO |

A cobertura ajustada é calculada no handler CAP (`srv/ai/reposicao-agent.js`) antes de chegar ao MCP Server — o servidor simplesmente expõe o campo `coberturaDias` já calculado.

---

## 7. Execução Local

```bash
# Instalar dependências
pip install mcp fastmcp requests uvicorn starlette

# Rodar localmente (aponta para o backend de dev em localhost:4004)
SRV_URL=http://localhost:4004 python docs/integração/mcp_server_cf.py
```

> **Nota:** Para testar sem autenticação, basta não definir `TOKEN_URL`, `CLIENT_ID` e `CLIENT_SECRET` — o servidor omite o header `Authorization` e funciona com o `cds watch` (auth: mocked).

---

## 8. Deploy no Cloud Foundry

O MCP Server é deployado como uma CF app separada, definida no `mta.yaml`:

```yaml
- name: joule-myfranchise-mcp
  type: python
  path: docs/integração
  parameters:
    memory: 256M
    buildpack: python_buildpack
  env:
    SRV_URL: ~{myfranchise-srv-url}
    MES_REFERENCIA: "7"
  requires:
    - name: myfranchise-xsuaa
      parameters:
        env-var-name: XSUAA_CREDENTIALS
```

---

## 9. Health Check

```bash
curl https://joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com/health
```

```json
{
  "status": "UP",
  "service": "joule-myfranchise-mcp",
  "version": "1.0.0",
  "tools": [
    "get_lojas_em_risco",
    "get_cobertura_estoque",
    "get_pedidos_pendentes",
    "get_recomendacoes",
    "get_score_rede",
    "aprovar_pedido",
    "recusar_pedido"
  ],
  "mes_referencia": 7
}
```

---

## 10. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `401 Unauthorized` nos GETs | `CLIENT_ID`/`CLIENT_SECRET` incorretos ou `TOKEN_URL` errado | Verificar variáveis de ambiente via `cf env joule-myfranchise-mcp` |
| `403 Forbidden` nos POSTs | CSRF token não obtido ou expirado | O servidor faz Fetch automático — verificar se o cookie CSRF está sendo propagado |
| `409 Conflict` no `aprovar_pedido` | Pedido não está em status `PENDENTE` | Verificar status com `get_pedidos_pendentes()` antes de aprovar |
| `404 Not Found` no pedido | UUID incorreto | Usar `get_pedidos_pendentes()` para obter o UUID correto |
| DNS rebinding protection error | CF_HOST não configurado ou incorreto | Definir `CF_HOST` com o hostname exato do app no CF |
