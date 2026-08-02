#!/usr/bin/env python3
"""
MCP Server — RunMyFranchise Joule (Cloud Foundry)

Padrão: igual ao joule-sfsf-mcp / pocsfsf.
- Destination sem auth (NoAuthentication)
- Token OAuth2 obtido internamente via client_credentials do XSUAA
- TransportSecuritySettings para evitar 421 no CF Go Router

Variáveis de ambiente (cf set-env):
  SRV_URL        = URL do myfranchise-srv
  TOKEN_URL      = https://<tenant>.authentication.us10.hana.ondemand.com/oauth/token
  CLIENT_ID      = clientid do XSUAA
  CLIENT_SECRET  = clientsecret do XSUAA
  PORT           = porta (CF injeta automaticamente)
  MES_REFERENCIA = mês de referência sazonal (padrão: 7)
"""

import os
import json
import time
import datetime
import requests
from mcp.server.fastmcp import FastMCP
try:
    from mcp.server.transport_security import TransportSecuritySettings
    _has_transport_security = True
except ImportError:
    _has_transport_security = False

# ─── Configuração ─────────────────────────────────────────────────
SRV_URL       = os.environ.get("SRV_URL", "http://localhost:4004")
TOKEN_URL     = os.environ.get("TOKEN_URL", "")
CLIENT_ID     = os.environ.get("CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("CLIENT_SECRET", "")
MES_REF       = int(os.environ.get("MES_REFERENCIA", "7"))
PORT          = int(os.environ.get("PORT", "8080"))
CF_HOST       = os.environ.get("CF_HOST", "joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com")

# ─── Token cache ──────────────────────────────────────────────────
_token_cache: dict = {}

def get_token() -> str:
    """Obtém Bearer token via XSUAA client_credentials (com cache)."""
    now = time.time()
    if _token_cache.get("expires_at", 0) - 30 > now:
        return _token_cache["token"]
    if not TOKEN_URL or not CLIENT_ID or not CLIENT_SECRET:
        return ""
    try:
        r = requests.post(
            TOKEN_URL,
            auth=(CLIENT_ID, CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            timeout=10,
        )
        token = r.json().get("access_token", "") if r.status_code == 200 else ""
        _token_cache["token"]      = token
        _token_cache["expires_at"] = now + 3500
        return token
    except Exception:
        return ""

def odata(path: str, params: dict = None) -> dict:
    """Chama a OData API do myfranchise-srv com token Bearer."""
    token = get_token()
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    url = f"{SRV_URL}/franqueadora/{path}"
    resp = requests.get(url, headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()

def odata_post(path: str, body: dict) -> dict:
    """Executa uma bound action OData V4 via POST."""
    token = get_token()
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    # Fetch CSRF token (OData V4 CAP exige x-csrf-token em POST)
    csrf_resp = requests.get(
        f"{SRV_URL}/franqueadora/",
        headers={**headers, "x-csrf-token": "Fetch"},
        timeout=10,
    )
    csrf = csrf_resp.headers.get("x-csrf-token", "")
    if csrf:
        headers["x-csrf-token"] = csrf
        headers["Cookie"] = "; ".join(
            f"{k}={v}" for k, v in csrf_resp.cookies.items()
        )
    url = f"{SRV_URL}/franqueadora/{path}"
    resp = requests.post(url, headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    if resp.content:
        return resp.json()
    return {"ok": True}

# ─── FastMCP ──────────────────────────────────────────────────────
_mcp_kwargs = {
    "instructions": (
        "You are the assistant for the RunMyFranchise franchise network. "
        "Use the tools to answer questions about inventory, stockouts, "
        "AI recommendations, store health scores, and replenishment orders. "
        "Consider seasonality: Havaianas in July have 1.8x demand in NE and 0.4x in South. "
        "RULE: When the user mentions 'orders', 'approval', 'pending replenishment', "
        "'waiting', use get_pedidos_pendentes() immediately. "
        "RULE: To approve a single order by ID, use aprovar_pedido(). "
        "To approve ALL pending orders at once, use aprovar_pedidos(). "
        "To reject, use recusar_pedido(). "
        "Store names like 'Porto Alegre', 'Loja Recife' are accepted — no need to know the ID. "
        "If the user doesn't specify the ID, use get_pedidos_pendentes() first to list."
    ),
}
if _has_transport_security:
    _mcp_kwargs["transport_security"] = TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=[CF_HOST, "localhost:*", "127.0.0.1:*", "*.cfapps.us10.hana.ondemand.com"],
    )

mcp = FastMCP("RunMyFranchise Joule", **_mcp_kwargs)

# ─── TOOL 1: lojas em risco de ruptura ───────────────────────────
@mcp.tool()
def get_lojas_em_risco(regiao: str = "", categoria: str = "") -> str:
    """
    List stores at risk of stockout (coverage < lead time), considering regional seasonality.
    regiao: region filter (NE, S, SE, CO, N). categoria: product category filter (e.g. Sandálias).
    Example: get_lojas_em_risco(regiao='NE')
    """
    try:
        data  = odata("Estoque_Unidade", {
            "$select": "unidade_ID,unidadeNome,unidadeCidade,regiaoCode,sku,nomeProduto,categoria,saldoAtual,coberturaDias,leadTimeDias,estoqueCriticality",
            "$top": "200",
        })
        items = data.get("value", [])
        if regiao:
            items = [i for i in items if i.get("regiaoCode") == regiao]
        if categoria:
            items = [i for i in items if (i.get("categoria") or "").lower() == categoria.lower()]
        items = [i for i in items if int(i.get("estoqueCriticality") or 3) < 3]
        items.sort(key=lambda i: float(i.get("coberturaDias") or 999))

        if not items:
            return json.dumps({"total": 0, "mensagem": "No stores at risk with these filters.", "mes_referencia": MES_REF})

        return json.dumps({
            "total": len(items),
            "mes_referencia": MES_REF,
            "lojas": [{
                "loja":         i.get("unidadeNome"),
                "cidade":       i.get("unidadeCidade"),
                "regiao":       i.get("regiaoCode"),
                "produto":      i.get("nomeProduto"),
                "saldo":        i.get("saldoAtual"),
                "coberturaDias": i.get("coberturaDias"),
                "leadTime":     i.get("leadTimeDias"),
                "criticidade":  "CRITICAL STOCKOUT" if int(i.get("estoqueCriticality") or 3) == 1 else "WARNING",
            } for i in items]
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── TOOL 2: cobertura de SKU numa loja ──────────────────────────
@mcp.tool()
def get_cobertura_estoque(unidade_id: str, sku: str = "") -> str:
    """
    Returns stock coverage in days for a store with seasonal adjustment.
    unidade_id: store ID (e.g. u178) OR store name/city (e.g. 'Porto Alegre', 'Loja Recife').
    sku: optional SKU filter.
    Example: get_cobertura_estoque(unidade_id='Porto Alegre')
    """
    try:
        # Resolve name → ID
        resolved_id = unidade_id
        if unidade_id and (not unidade_id.startswith("u") or not unidade_id[1:].isdigit()):
            search = unidade_id.lower().replace("loja ", "").strip()
            all_units = odata("Unidades", {"$select": "ID,nome,cidade", "$top": "100"}).get("value", [])
            found = next((u for u in all_units
                if search in (u.get("nome") or "").lower()
                or search in (u.get("cidade") or "").lower()), None)
            if found:
                resolved_id = found["ID"]

        data  = odata("Estoque_Unidade", {
            "$select": "unidade_ID,unidadeNome,unidadeCidade,regiaoCode,sku,nomeProduto,saldoAtual,coberturaDias,leadTimeDias,estoqueCriticality",
            "$top": "200",
        })
        items = [i for i in data.get("value", []) if i.get("unidade_ID") == resolved_id]
        if sku:
            items = [i for i in items if i.get("sku") == sku]
        if not items:
            return json.dumps({"erro": f"No items found for {unidade_id}"})
        u = items[0]
        return json.dumps({
            "loja":    u.get("unidadeNome"),
            "cidade":  u.get("unidadeCidade"),
            "regiao":  u.get("regiaoCode"),
            "mes_referencia": MES_REF,
            "itens": [{
                "sku":          i.get("sku"),
                "produto":      i.get("nomeProduto"),
                "saldo":        i.get("saldoAtual"),
                "coberturaDias": i.get("coberturaDias"),
                "leadTime":     i.get("leadTimeDias"),
                "status":       "CRITICAL STOCKOUT" if int(i.get("estoqueCriticality") or 3) == 1 else "WARNING" if int(i.get("estoqueCriticality") or 3) == 2 else "OK",
            } for i in items]
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── TOOL 3: pedidos pendentes ────────────────────────────────────
@mcp.tool()
def get_pedidos_pendentes(unidade_id: str = "", status: str = "PENDENTE") -> str:
    """
    List replenishment orders. Accepts store name/city OR store ID.
    unidade_id: store name (e.g. 'Porto Alegre', 'Loja Recife') or ID (e.g. 'u147'). Leave empty for all stores.
    status: PENDENTE (default), APROVADO, RECUSADO, RECEBIDO.
    Example: get_pedidos_pendentes(unidade_id='Porto Alegre')
    Example: get_pedidos_pendentes() — lists all pending orders network-wide.
    """
    try:
        unids_list = odata("Unidades", {"$select": "ID,nome,cidade", "$top": "100"}).get("value", [])
        unids = {u["ID"]: u for u in unids_list}

        # Resolve name → ID
        resolved_id = unidade_id
        if unidade_id and (not unidade_id.startswith("u") or not unidade_id[1:].isdigit()):
            search = unidade_id.lower().replace("loja ", "").strip()
            found = next((u for u in unids_list
                if search in (u.get("nome") or "").lower()
                or search in (u.get("cidade") or "").lower()), None)
            if found:
                resolved_id = found["ID"]

        data  = odata("Pedidos_Reposicao", {"$top": "200"})
        items = [i for i in data.get("value", []) if i.get("status_code") == status]
        if resolved_id:
            items = [i for i in items if i.get("unidade_ID") == resolved_id]

        return json.dumps({
            "total": len(items),
            "status": status,
            "pedidos": [{
                "id":          i.get("ID"),
                "loja":        unids.get(i.get("unidade_ID"), {}).get("nome", i.get("unidade_ID")),
                "cidade":      unids.get(i.get("unidade_ID"), {}).get("cidade"),
                "produto":     i.get("nomeProduto"),
                "sku":         i.get("sku"),
                "qtdSugerida": i.get("qtdSugerida"),
                "fornecedor":  i.get("fornecedorSugerido"),
                "prazo":       i.get("prazoDesejado"),
                "justificativa": i.get("justificativa"),
            } for i in items]
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── TOOL 4: recomendações da IA ─────────────────────────────────
@mcp.tool()
def get_recomendacoes(unidade_id: str = "", prioridade: str = "") -> str:
    """
    Returns AI recommendations (gpt-4o) for stores.
    unidade_id: store name/city or ID (optional). prioridade: ALTA, MEDIA, BAIXA (optional).
    Example: get_recomendacoes(unidade_id='Porto Alegre')
    """
    try:
        unids_list = odata("Unidades", {"$select": "ID,nome,cidade", "$top": "100"}).get("value", [])
        unids = {u["ID"]: u for u in unids_list}

        # Resolve name → ID
        resolved_id = unidade_id
        if unidade_id and (not unidade_id.startswith("u") or not unidade_id[1:].isdigit()):
            search = unidade_id.lower().replace("loja ", "").strip()
            found = next((u for u in unids_list
                if search in (u.get("nome") or "").lower()
                or search in (u.get("cidade") or "").lower()), None)
            if found:
                resolved_id = found["ID"]

        data  = odata("Recomendacoes", {"$top": "100"})
        items = [i for i in data.get("value", []) if i.get("status_code") == "NOVA"]
        if resolved_id:
            items = [i for i in items if i.get("unidade_ID") == resolved_id]
        if prioridade:
            items = [i for i in items if i.get("prioridade_code") == prioridade.upper()]

        return json.dumps({
            "total": len(items),
            "recomendacoes": [{
                "loja":      unids.get(i.get("unidade_ID"), {}).get("nome", i.get("unidade_ID")),
                "tipo":      i.get("tipo_code"),
                "prioridade": i.get("prioridade_code"),
                "titulo":    i.get("titulo"),
                "descricao": i.get("descricao"),
            } for i in items]
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── TOOL 5: score de saúde ───────────────────────────────────────
@mcp.tool()
def get_score_rede(regiao: str = "", somente_criticas: bool = False) -> str:
    """
    Returns the health score of all stores in the franchise network.
    regiao: NE, S, SE, CO, N (optional). somente_criticas: True for critical stores only.
    Example: get_score_rede() — full network overview.
    Example: get_score_rede(somente_criticas=True) — only critical stores.
    """
    try:
        data  = odata("Saude_Dashboard", {"$top": "100"})
        all_  = data.get("value", [])
        items = list(all_)
        if regiao:
            items = [i for i in items if i.get("regiao_code") == regiao]
        if somente_criticas:
            items = [i for i in items if int(i.get("scoreCriticality") or 3) == 1]
        items.sort(key=lambda i: float(i.get("scoreSaude") or 100))

        return json.dumps({
            "network_summary": {
                "total":    len(all_),
                "critical": sum(1 for i in all_ if int(i.get("scoreCriticality") or 3) == 1),
                "warning":  sum(1 for i in all_ if int(i.get("scoreCriticality") or 3) == 2),
                "healthy":  sum(1 for i in all_ if int(i.get("scoreCriticality") or 3) == 3),
                "avgScore": round(sum(float(i.get("scoreSaude") or 0) for i in all_) / len(all_), 1) if all_ else 0,
            },
            "stores": [{
                "store":   i.get("nome"),
                "city":    i.get("cidade"),
                "region":  i.get("regiao_code"),
                "cluster": i.get("cluster_code"),
                "score":   i.get("scoreSaude"),
                "status":  "CRITICAL" if int(i.get("scoreCriticality") or 3) == 1 else "WARNING" if int(i.get("scoreCriticality") or 3) == 2 else "HEALTHY",
            } for i in items[:20]]
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── TOOL 6: aprovar pedido de reposição ─────────────────────────
@mcp.tool()
def aprovar_pedido(pedido_id: str, qtd_aprovada: int = 0, observacao: str = "") -> str:
    """
    Approve a single replenishment order by its ID. Status changes from PENDING to APPROVED.
    pedido_id: order UUID. Use get_pedidos_pendentes() to get the ID.
    qtd_aprovada: approved quantity (0 = use agent-suggested quantity).
    observacao: optional approval note.
    Example: aprovar_pedido(pedido_id='...', observacao='Urgent delivery approved')
    """
    try:
        body = {}
        if qtd_aprovada:
            body["qtdAprovada"] = qtd_aprovada
        if observacao:
            body["observacao"] = observacao
        result = odata_post(
            f"Pedidos_Reposicao(ID={pedido_id})/FranqueadoraService.aprovar",
            body
        )
        return json.dumps({
            "sucesso": True,
            "status": result.get("value", {}).get("status", "APROVADO"),
            "mensagem": result.get("value", {}).get("mensagem", "Pedido aprovado com sucesso."),
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── TOOL 7: recusar pedido de reposição ─────────────────────────
@mcp.tool()
def recusar_pedido(pedido_id: str, motivo: str = "") -> str:
    """
    Reject a single replenishment order by its ID. Status changes from PENDING to REJECTED.
    pedido_id: order UUID. Use get_pedidos_pendentes() to get the ID.
    motivo: reason for rejection (recommended for audit trail).
    Example: recusar_pedido(pedido_id='...', motivo='Stock already replenished via another route')
    """
    try:
        body = {}
        if motivo:
            body["motivo"] = motivo
        result = odata_post(
            f"Pedidos_Reposicao(ID={pedido_id})/FranqueadoraService.recusar",
            body
        )
        return json.dumps({
            "sucesso": True,
            "status": result.get("value", {}).get("status", "RECUSADO"),
            "mensagem": result.get("value", {}).get("mensagem", "Pedido recusado."),
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── TOOL 8: aprovar todos os pedidos de uma vez ──────────────────
@mcp.tool()
def aprovar_pedidos(unidade: str = "", observacao: str = "") -> str:
    """
    Approve ALL pending replenishment orders at once, or all for a specific store.
    unidade: store name or city (e.g. 'Porto Alegre', 'Loja Recife') or ID (e.g. 'u147'). Leave empty to approve all.
    observacao: optional approval note.
    Example: aprovar_pedidos() — approves all pending orders network-wide.
    Example: aprovar_pedidos(unidade='Porto Alegre') — approves all pending for that store.
    """
    try:
        params: dict = {"$filter": "status_code eq 'PENDENTE'", "$top": "200"}
        pedidos = odata("Pedidos_Reposicao", params).get("value", [])

        # Resolve store name → ID if needed
        if unidade:
            resolved_id = unidade
            if not unidade.startswith("u") or not unidade[1:].isdigit():
                search = unidade.lower().replace("loja ", "").strip()
                all_units = odata("Unidades", {"$select": "ID,nome,cidade", "$top": "100"}).get("value", [])
                found = next((u for u in all_units
                    if search in (u.get("nome") or "").lower()
                    or search in (u.get("cidade") or "").lower()), None)
                if found:
                    resolved_id = found["ID"]
            pedidos = [p for p in pedidos if p.get("unidade_ID") == resolved_id]

        if not pedidos:
            return json.dumps({"aprovados": 0, "mensagem": f"No pending orders{'for ' + unidade if unidade else ' in the network'}."})

        aprovados = 0
        for p in pedidos:
            body = {"qtdAprovada": p.get("qtdSugerida", 0)}
            if observacao:
                body["observacao"] = observacao
            odata_post(f"Pedidos_Reposicao(ID={p['ID']})/FranqueadoraService.aprovar", body)
            aprovados += 1

        return json.dumps({
            "aprovados": aprovados,
            "mensagem": f"{aprovados} order(s) approved{(' for ' + unidade) if unidade else ' across the network'}."
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── TOOL 9: acionar agente de reposição ─────────────────────────
@mcp.tool()
def acionar_reposicao(unidade: str = "") -> str:
    """
    Trigger the AI Replenishment Agent for a store or all stores in stockout.
    unidade: store name, city, or ID. Leave empty to trigger all stores currently in stockout.
    The agent uses gpt-4o to calculate quantities and creates PENDING orders for approval.
    Example: acionar_reposicao() — triggers all stores in stockout.
    Example: acionar_reposicao(unidade='Porto Alegre') — triggers only that store.
    """
    try:
        # Resolve store name → ID
        resolved_id = unidade
        if unidade and (not unidade.startswith("u") or not unidade[1:].isdigit()):
            search = unidade.lower().replace("loja ", "").strip()
            all_units = odata("Unidades", {"$select": "ID,nome,cidade", "$top": "100"}).get("value", [])
            found = next((u for u in all_units
                if search in (u.get("nome") or "").lower()
                or search in (u.get("cidade") or "").lower()), None)
            if found:
                resolved_id = found["ID"]

        if resolved_id:
            result = odata_post("gerarReposicao", {"unidade_ID": resolved_id})
            val = result.get("value", {})
            return json.dumps({
                "unidade": unidade or resolved_id,
                "pedidos_gerados": val.get("pedidos", 0),
                "modo": val.get("modo", ""),
                "mensagem": f"{val.get('pedidos', 0)} order(s) created for {unidade or resolved_id}. Awaiting approval."
            }, ensure_ascii=False)
        else:
            result = odata_post("gerarReposicaoTodas", {})
            val = result.get("value", {})
            return json.dumps({
                "pedidos_gerados": val.get("pedidos", 0),
                "unidades": val.get("unidades", 0),
                "modo": val.get("modo", ""),
                "mensagem": f"{val.get('pedidos', 0)} order(s) created across {val.get('unidades', 0)} store(s). Awaiting approval."
            }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"erro": str(e)})

# ─── Entrypoint HTTP para Cloud Foundry ──────────────────────────
if __name__ == "__main__":
    import uvicorn
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.middleware.trustedhost import TrustedHostMiddleware
    from starlette.requests import Request as StarletteRequest
    from starlette.responses import JSONResponse

    print(f"✅ joule-myfranchise-mcp iniciando na porta {PORT}")

    mcp_app = mcp.streamable_http_app()

    class HealthMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: StarletteRequest, call_next):
            if request.url.path == "/health":
                return JSONResponse({
                    "status": "UP", "service": "joule-myfranchise-mcp", "version": "1.0.0",
                    "tools": ["get_lojas_em_risco","get_cobertura_estoque","get_pedidos_pendentes","get_recomendacoes","get_score_rede","aprovar_pedido","recusar_pedido","aprovar_pedidos","acionar_reposicao"],
                    "mes_referencia": MES_REF,
                })
            return await call_next(request)

    app = mcp_app
    app = HealthMiddleware(app)
    app = TrustedHostMiddleware(app, allowed_hosts=["*"])

    uvicorn.run(app, host="0.0.0.0", port=PORT, forwarded_allow_ips="*", proxy_headers=True)
