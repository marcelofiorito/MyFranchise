"""
============================================================
  RunMyFranchise — Predição de Ruptura de Estoque
  Powered by: SAP AI Core — sap-rpt-1.5-large
  Modelo SAP RPT (Relational Pretrained Transformer)

  Como funciona:
    Upload de CSV com histórico de estoque por loja/produto/mês
    → SAP RPT aprende padrões das linhas com ruptura/qtd preenchidos
    → Prediz ruptura e quantidade de reposição para meses futuros
    → Sem treinamento, sem data science — zero-shot em dados tabulares

  Formato da API RPT:
    POST /v2/inference/deployments/{id}/predict
    {
      "prediction_config": {
        "target_columns": [{"name": "col", "prediction_placeholder": null}]
      },
      "columns": { "col1": [...], "col2": [...], ... }
    }
============================================================
"""

import os
import json
import urllib.request
import urllib.parse
from pathlib import Path

import streamlit as st
import pandas as pd

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

from header import render_header

AI_API_URL     = "https://api.ai.prod.us-east-1.aws.ml.hana.ondemand.com"
DEPLOYMENT_ID  = "dd29eaf190e6bceb"
MODEL          = "sap-rpt-1.5-large"
RESOURCE_GROUP = "default"

CORES_RUPTURA = {
    "RUPTURA":  "🔴",
    "ATENCAO":  "🟠",
    "NÃO":      "🟢",
}


@st.cache_data(ttl=3000)
def get_token() -> str:
    data = urllib.parse.urlencode({
        "grant_type":    "client_credentials",
        "client_id":     os.environ["AI_CORE_CLIENT_ID"],
        "client_secret": os.environ["AI_CORE_CLIENT_SECRET"],
    }).encode()
    req = urllib.request.Request(
        os.environ["AI_CORE_OAUTH_URL"], data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["access_token"]


def prever(df: pd.DataFrame, coluna_alvo: str) -> list:
    """Chama SAP RPT — linhas com coluna_alvo vazio são preditas."""
    columns_payload = {}
    for col in df.columns:
        if col == coluna_alvo:
            columns_payload[col] = [
                None if (pd.isna(v) or str(v).strip() == "") else v
                for v in df[col]
            ]
        else:
            columns_payload[col] = [
                None if pd.isna(v) else v
                for v in df[col]
            ]

    payload = {
        "prediction_config": {
            "target_columns": [{"name": coluna_alvo, "prediction_placeholder": None}]
        },
        "columns": columns_payload
    }

    body = json.dumps(payload).encode()
    req  = urllib.request.Request(
        f"{AI_API_URL}/v2/inference/deployments/{DEPLOYMENT_ID}/predict",
        data=body,
        headers={
            "Authorization":     f"Bearer {get_token()}",
            "AI-Resource-Group": RESOURCE_GROUP,
            "Content-Type":      "application/json",
        }
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())

    return result.get("predictions", [])


def main():
    st.set_page_config(
        page_title="Predição de Ruptura — RunMyFranchise",
        page_icon="📦",
        layout="wide",
    )

    render_header("Predição de Ruptura de Estoque · SAP RPT")
    st.divider()

    with st.sidebar:
        st.markdown("### 🧠 Sobre o SAP RPT")
        st.markdown("""
**SAP RPT** (Relational Pretrained Transformer) é um modelo SAP treinado em dados
tabulares estruturados — planilhas, tabelas de banco de dados, extratos SAP.

**No contexto de franquias:**
- Aprende padrões sazonais por região e produto
- Prediz risco de ruptura antes que aconteça
- Estima quantidade ideal de reposição
- Sem treinamento prévio — in-context learning

**Como usar:**
1. O CSV tem linhas com `ruptura` e `qtd_reposicao` preenchidos (histórico)
2. E linhas com esses campos em branco (meses futuros a prever)
3. O RPT aprende: NE + julho + fator 1.8x + cobertura < 3d → RUPTURA
""")
        st.markdown("---")
        st.markdown("### 🔗 Modelo")
        st.code(MODEL)
        st.caption(f"Deployment: `{DEPLOYMENT_ID}`")
        st.markdown("---")
        st.markdown("### 📥 Dados de exemplo")
        dados_path = Path(__file__).parent / "dados" / "historico_estoque_franquias.csv"
        if dados_path.exists():
            with open(dados_path, "rb") as f:
                st.download_button(
                    "⬇️ Baixar CSV de exemplo",
                    f.read(),
                    file_name="historico_estoque_franquias.csv",
                    mime="text/csv",
                    use_container_width=True,
                )

    # ── Upload ────────────────────────────────────────────────────
    st.markdown("### 📂 Upload da planilha")
    st.markdown(
        "Carregue um CSV com histórico de estoque por loja/produto/mês. "
        "Linhas com **ruptura preenchida** são o contexto de aprendizado. "
        "Linhas com **ruptura em branco** (meses futuros) serão preditas pelo SAP RPT."
    )

    uploaded = st.file_uploader("Planilha CSV de estoque", type=["csv"])

    dados_path = Path(__file__).parent / "dados" / "historico_estoque_franquias.csv"
    if uploaded is None and dados_path.exists():
        st.info("Usando dados de exemplo (RunMyFranchise). Faça upload para substituir.", icon="📋")
        df = pd.read_csv(dados_path)
    elif uploaded:
        df = pd.read_csv(uploaded)
    else:
        st.stop()

    # ── Configuração ──────────────────────────────────────────────
    st.markdown("### ⚙️ Configuração")
    col_cfg1, col_cfg2 = st.columns([1, 1])
    with col_cfg1:
        default_target = "ruptura" if "ruptura" in df.columns else df.columns[0]
        coluna_alvo = st.selectbox(
            "Coluna a prever (target)",
            df.columns.tolist(),
            index=df.columns.tolist().index(default_target),
        )
    with col_cfg2:
        default_cols = ["loja", "sku", "produto", "regiao", "mes", "ruptura", "qtd_reposicao"]
        default_cols = [c for c in default_cols if c in df.columns]
        colunas_exibir = st.multiselect(
            "Colunas a exibir no resultado",
            df.columns.tolist(),
            default=default_cols or df.columns.tolist()[:6],
        )

    # ── Métricas ──────────────────────────────────────────────────
    n_treino = df[coluna_alvo].notna().sum() - (df[coluna_alvo] == "").sum()
    n_prever = df[coluna_alvo].isna().sum() + (df[coluna_alvo] == "").sum()

    col_m1, col_m2, col_m3 = st.columns(3)
    col_m1.metric("Total de linhas", len(df))
    col_m2.metric("Com histórico (contexto)", n_treino)
    col_m3.metric("A prever", n_prever, delta=f"{n_prever} predições")

    with st.expander("📋 Preview da planilha", expanded=False):
        st.dataframe(df, use_container_width=True)

    st.divider()

    if n_prever == 0:
        st.warning("Nenhuma linha com a coluna alvo em branco. Deixe linhas futuras sem valor para o modelo prever.")
        st.stop()

    # ── Predição ──────────────────────────────────────────────────
    if st.button("🚀 Prever Ruptura com SAP RPT", type="primary", use_container_width=True):
        with st.spinner(f"Passo 1/2 — Prevendo ruptura para {n_prever} lojas ({MODEL})..."):
            try:
                predicoes = prever(df, coluna_alvo)
            except Exception as e:
                st.error(f"Erro na predição: `{e}`")
                st.stop()

        df_result = df.copy()
        mascara_vazio = df[coluna_alvo].isna() | (df[coluna_alvo] == "")
        indices_vazios = df_result[mascara_vazio].index.tolist()

        for i, pred_item in enumerate(predicoes):
            if i < len(indices_vazios):
                idx   = indices_vazios[i]
                preds = pred_item.get(coluna_alvo, [])
                if preds:
                    best = preds[0]
                    conf = best.get('confidence') or 0
                    df_result.at[idx, coluna_alvo]         = best["prediction"]
                    df_result.at[idx, "_confianca"]         = f"{conf*100:.0f}%" if conf else "—"
                    df_result.at[idx, "_predicao_sap_rpt"] = True

        # ── Passo 2: prever qtd_reposicao para linhas de RUPTURA/ATENCAO ──
        col_qtd = "qtd_reposicao"
        if col_qtd in df_result.columns:
            em_risco = df_result["_predicao_sap_rpt"] == True
            em_risco &= df_result[coluna_alvo].isin(["RUPTURA", "ATENCAO"])
            if em_risco.any():
                with st.spinner(f"Passo 2/2 — Prevendo quantidade de reposição para {em_risco.sum()} lojas em risco..."):
                    try:
                        # Monta df para previsão de qtd: usa histórico + linhas em risco (agora com ruptura preenchida)
                        df_qtd = df_result.copy()
                        # Zera qtd só nas linhas que vamos prever
                        df_qtd.loc[em_risco, col_qtd] = None
                        predicoes_qtd = prever(df_qtd, col_qtd)

                        indices_qtd = df_result[em_risco].index.tolist()
                        for i, pred_item in enumerate(predicoes_qtd):
                            if i < len(indices_qtd):
                                idx = indices_qtd[i]
                                preds = pred_item.get(col_qtd, [])
                                if preds:
                                    val = preds[0]["prediction"]
                                    conf_qtd = preds[0].get('confidence') or 0
                                    try: val = int(round(float(val)))
                                    except: pass
                                    df_result.at[idx, col_qtd] = val
                                    df_result.at[idx, "_confianca_qtd"] = f"{conf_qtd*100:.0f}%" if conf_qtd else "—"
                    except Exception as e:
                        st.warning(f"Previsão de quantidade indisponível: {e}")

        st.markdown("## 📊 Resultado da Predição SAP RPT")

        # Resumo
        st.markdown("### Distribuição de Risco — Mês Previsto")
        df_pred = df_result[df_result.get("_predicao_sap_rpt", False) == True].copy()
        riscos = df_pred[coluna_alvo].value_counts()
        cols_risco = st.columns(max(len(riscos), 1))
        for i, (risco, qtd) in enumerate(riscos.items()):
            icone = CORES_RUPTURA.get(str(risco).upper(), "⚪")
            cols_risco[i].metric(f"{icone} {risco}", qtd)

        # Tabela
        st.markdown("### Lojas com predição")
        colunas_mostrar = (colunas_exibir or df.columns.tolist()) + ["_confianca"]
        colunas_mostrar = [c for c in colunas_mostrar if c in df_pred.columns]

        def colorir(val):
            cores = {
                "RUPTURA": "#ffe0e0",
                "ATENCAO": "#fff3e0",
                "NÃO":     "#e8f5e9",
            }
            return f"background-color: {cores.get(str(val).upper(), '')}"

        if coluna_alvo in colunas_mostrar:
            styled = df_pred[colunas_mostrar].style.applymap(colorir, subset=[coluna_alvo])
            st.dataframe(styled, use_container_width=True)
        else:
            st.dataframe(df_pred[colunas_mostrar], use_container_width=True)

        with st.expander("📋 Planilha completa com predições", expanded=False):
            st.dataframe(
                df_result[[c for c in colunas_mostrar if c in df_result.columns]],
                use_container_width=True
            )

        csv_out = df_result.drop(columns=["_predicao_sap_rpt", "_confianca"], errors="ignore").to_csv(index=False)
        st.download_button(
            "⬇️ Baixar planilha com predições",
            csv_out.encode(),
            file_name="predicao_ruptura_franquias.csv",
            mime="text/csv",
            use_container_width=True,
        )

    st.divider()
    st.caption("RunMyFranchise · Predição de Ruptura · SAP AI Core + sap-rpt-1.5-large · Solution Advisory BAIP 2026")


if __name__ == "__main__":
    main()
