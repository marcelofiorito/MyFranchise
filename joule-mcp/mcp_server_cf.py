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
NODE_MCP_URL  = os.environ.get("NODE_MCP_URL", "https://sa-build-platform-org-dev-myfranchise-mcp.cfapps.us10.hana.ondemand.com/mcp")
TOKEN_URL     = os.environ.get("TOKEN_URL", "")
CLIENT_ID     = os.environ.get("CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("CLIENT_SECRET", "")
MES_REF       = int(os.environ.get("MES_REFERENCIA", "7"))
PORT          = int(os.environ.get("PORT", "8080"))
CF_HOST       = os.environ.get("CF_HOST", "joule-myfranchise-mcp.cfapps.us10.hana.ondemand.com")

# ─── Relay para Node.js MCP (acesso direto ao HANA, mais rápido) ──
_node_req_id = 0
def node_call(tool_name: str, arguments: dict) -> str:
    """Chama o Node.js MCP — initialize + tools/call na mesma sessão HTTP."""
    global _node_req_id
    try:
        session = requests.Session()
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}

        # initialize — obtém mcp-session-id se existir
        _node_req_id += 1
        init_resp = session.post(NODE_MCP_URL, json={
            "jsonrpc": "2.0", "method": "initialize",
            "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "python-relay", "version": "1.0"}},
            "id": _node_req_id
        }, headers=headers, timeout=8)

        # Captura session id se o servidor retornar
        session_id = init_resp.headers.get("mcp-session-id")
        if session_id:
            headers["mcp-session-id"] = session_id

        # tools/call
        _node_req_id += 1
        resp = session.post(NODE_MCP_URL, json={
            "jsonrpc": "2.0", "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
            "id": _node_req_id
        }, headers=headers, timeout=25)

        text = resp.text.strip()

        # JSON direto
        try:
            data = json.loads(text)
            content = data.get("result", {}).get("content", [{}])
            if content:
                return content[0].get("text", "{}")
        except Exception:
            pass

        # SSE linha a linha
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("data:"):
                payload = line[5:].strip()
                if payload and payload != "[DONE]":
                    try:
                        data = json.loads(payload)
                        content = data.get("result", {}).get("content", [{}])
                        if content:
                            return content[0].get("text", "{}")
                    except Exception:
                        continue

        return json.dumps({"erro": f"No data from Node.js: {text[:200]}"})
    except Exception as e:
        return json.dumps({"erro": str(e)})

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
    regiao: region filter (NE, S, SE, CO, N). categoria: product category filter.
    Example: get_lojas_em_risco(regiao='NE')
    """
    args = {}
    if regiao: args["regiao_code"] = regiao
    if categoria: args["categoria"] = categoria
    return node_call("get_lojas_em_risco", args)

# ─── TOOL 2: cobertura de SKU numa loja ──────────────────────────
@mcp.tool()
def get_cobertura_estoque(unidade_id: str, sku: str = "") -> str:
    """
    Returns stock coverage in days for a store with seasonal adjustment.
    unidade_id: store ID or name/city (e.g. 'Porto Alegre', 'Loja Recife').
    Example: get_cobertura_estoque(unidade_id='Porto Alegre')
    """
    args = {"unidade_ID": unidade_id}
    if sku: args["sku"] = sku
    return node_call("get_cobertura_estoque", args)

# ─── TOOL 3: pedidos pendentes ────────────────────────────────────
@mcp.tool()
def get_pedidos_pendentes(unidade_id: str = "", status: str = "PENDENTE") -> str:
    """
    List replenishment orders. Accepts store name/city OR store ID.
    unidade_id: store name (e.g. 'Porto Alegre') or ID (e.g. 'u147'). Leave empty for all stores.
    status: PENDENTE (default), APROVADO, RECUSADO, RECEBIDO.
    Example: get_pedidos_pendentes(unidade_id='Porto Alegre')
    """
    args = {"status_code": status}
    if unidade_id: args["unidade_ID"] = unidade_id
    return node_call("get_pedidos_pendentes", args)

# ─── TOOL 4: recomendações da IA ─────────────────────────────────
@mcp.tool()
def get_recomendacoes(unidade_id: str = "", prioridade: str = "") -> str:
    """
    Returns AI recommendations (gpt-4o) for stores.
    unidade_id: store name/city or ID (optional). prioridade: ALTA, MEDIA, BAIXA (optional).
    Example: get_recomendacoes(unidade_id='Porto Alegre')
    """
    args = {}
    if unidade_id: args["unidade_ID"] = unidade_id
    if prioridade: args["prioridade"] = prioridade
    return node_call("get_recomendacoes", args)

# ─── TOOL 5: score de saúde ───────────────────────────────────────
@mcp.tool()
def get_score_rede(regiao: str = "", somente_criticas: bool = False) -> str:
    """
    Returns the health score of all stores in the franchise network.
    regiao: NE, S, SE, CO, N (optional). somente_criticas: True for critical stores only.
    Example: get_score_rede() — full network overview.
    """
    args = {}
    if regiao: args["regiao_code"] = regiao
    if somente_criticas: args["criticidade"] = 1
    return node_call("get_score_rede", args)

# ─── TOOL 6: aprovar pedido de reposição ─────────────────────────
@mcp.tool()
def aprovar_pedido(pedido_id: str, qtd_aprovada: int = 0, observacao: str = "") -> str:
    """
    Approve a single replenishment order by its ID. Status changes from PENDING to APPROVED.
    pedido_id: order UUID. Use get_pedidos_pendentes() to get the ID.
    qtd_aprovada: approved quantity (0 = use agent-suggested quantity).
    Example: aprovar_pedido(pedido_id='...')
    """
    args = {"pedido_id": pedido_id}
    if qtd_aprovada: args["qtd_aprovada"] = qtd_aprovada
    if observacao: args["observacao"] = observacao
    return node_call("confirm_single_order", args)

# ─── TOOL 7: recusar pedido de reposição ─────────────────────────
@mcp.tool()
def recusar_pedido(pedido_id: str, motivo: str = "") -> str:
    """
    Reject a single replenishment order by its ID. Status changes from PENDING to REJECTED.
    pedido_id: order UUID. Use get_pedidos_pendentes() to get the ID.
    Example: recusar_pedido(pedido_id='...', motivo='Stock already replenished')
    """
    args = {"pedido_id": pedido_id}
    if motivo: args["motivo"] = motivo
    return node_call("reject_order", args)

# ─── TOOL 8: aprovar todos os pedidos de uma vez ──────────────────
@mcp.tool()
def aprovar_pedidos(unidade: str = "", observacao: str = "") -> str:
    """
    Approve ALL pending replenishment orders at once, or all for a specific store.
    unidade: store name or city (e.g. 'Porto Alegre') or ID (e.g. 'u147'). Leave empty to approve all.
    Example: aprovar_pedidos() — approves all pending orders network-wide.
    Example: aprovar_pedidos(unidade='Porto Alegre') — approves all pending for that store.
    """
    args = {}
    if unidade: args["unidade_ID"] = unidade
    if observacao: args["observacao"] = observacao
    return node_call("process_replenishment_orders", args)

# ─── (kept for compatibility) ─────────────────────────────────────
# Note: aprovar_pedidos and acionar_reposicao below replaced by node_call above

# ─── TOOL 9: acionar agente de reposição ─────────────────────────
@mcp.tool()
def acionar_reposicao(unidade: str = "") -> str:
    """
    Trigger the AI Replenishment Agent for a store or all stores in stockout.
    unidade: store name, city, or ID. Leave empty to trigger all stores currently in stockout.
    Example: acionar_reposicao() — triggers all stores in stockout.
    """
    args = {}
    if unidade: args["unidade_ID"] = unidade
    return node_call("acionar_reposicao", args)

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
