"""Header compartilhado para os apps da demo Supergasbras."""

import base64
from pathlib import Path
import streamlit as st


def _img_to_b64(path: Path) -> tuple:
    data = base64.b64encode(path.read_bytes()).decode()
    mime = "image/svg+xml" if path.suffix == ".svg" else "image/png"
    return data, mime


def render_header(subtitle: str):
    """Renderiza o header padrão com logos SAP e BTP + título Solution Advisory."""
    img_dir = Path(__file__).parent / "img"

    # Usar PNG se disponível, senão SVG
    sap_path  = img_dir / "sap_logo.png"  if (img_dir / "sap_logo.png").exists()  else img_dir / "sap_logo.svg"
    btp_path  = img_dir / "btp_logo.png"  if (img_dir / "btp_logo.png").exists()  else img_dir / "btp_logo.svg"

    sap_b64, sap_mime = _img_to_b64(sap_path)
    btp_b64, btp_mime = _img_to_b64(btp_path)

    # Reduz o espaço em branco no topo sem esconder o header (que contém o botão da sidebar)
    st.markdown("""
        <style>
            .block-container { padding-top: 1rem !important; }
            header[data-testid="stHeader"] { background: transparent; }
        </style>
    """, unsafe_allow_html=True)

    st.markdown(f"""
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(90deg, #009FDB 0%, #1B6FB8 100%);
            padding: 12px 24px;
            border-radius: 8px;
            margin-bottom: 8px;
        ">
            <div style="display:flex; align-items:center; gap:20px;">
                <img src="data:{sap_mime};base64,{sap_b64}" height="52" style="background:white; padding:5px; border-radius:4px;"/>
                <img src="data:{btp_mime};base64,{btp_b64}" height="70" style="border-radius:4px;"/>
            </div>
            <div style="text-align:right;">
                <div style="color:rgba(255,255,255,0.8); font-size:11px; font-family:Arial,sans-serif; letter-spacing:0.5px;">
                    Solution Advisory · BAIP
                </div>
                <div style="color:white; font-size:15px; font-weight:bold; font-family:Arial,sans-serif;">
                    {subtitle}
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)
