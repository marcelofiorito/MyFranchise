#!/usr/bin/env python3
"""
RUNMYFRANCHISE_MF — Sync Script (DBADMIN)
==========================================
Recria todas as tabelas do schema RUNMYFRANCHISE_MF a partir do schema HDI.
Requer usuário DBADMIN (ou equivalente com CREATE/INSERT/DROP em RUNMYFRANCHISE_MF).

Uso:
  export HANA_HOST=70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com
  export HANA_PORT=443
  export HANA_USER=DBADMIN
  export HANA_PASSWORD=<sua senha>
  python3 scripts/sync-runmyfranchise-mf.py

Ou passe as credenciais inline:
  python3 scripts/sync-runmyfranchise-mf.py --host ... --port 443 --user DBADMIN --password ...
"""
import os, sys, argparse
from hdbcli import dbapi

# ─── HDI schema (source) — obtido do service key ─────────────────────────────
HDI_SCHEMA = "2177F43B75D34848AE3EA84FAB461E66"
MF_SCHEMA  = "RUNMYFRANCHISE_MF"

# ─── Tabelas a sincronizar (79 tabelas HDI) ───────────────────────────────────
TABLES = [
    "MYFRANCHISE_ALERTAS",
    "MYFRANCHISE_APROVACOESONBOARDING",
    "MYFRANCHISE_ATIVACAO_CAMPANHA_UNIDADE",
    "MYFRANCHISE_ATIVIDADES_REDE",
    "MYFRANCHISE_BENCHMARK_CLUSTER",
    "MYFRANCHISE_CALENDARIO_PROMOCIONAL",
    "MYFRANCHISE_CAMPANHAS",
    "MYFRANCHISE_CATALOGOS",
    "MYFRANCHISE_CLUSTER",
    "MYFRANCHISE_CLUSTER_TEXTS",
    "MYFRANCHISE_CONTRATOS_FRANQUIA",
    "MYFRANCHISE_DESVIOS",
    "MYFRANCHISE_DOCUMENTOSONBOARDING",
    "MYFRANCHISE_ESTOQUE_UNIDADE",
    "MYFRANCHISE_ETAPASONBOARDING",
    "MYFRANCHISE_FEED_FRANQUEADO",
    "MYFRANCHISE_FRANQUEADOS",
    "MYFRANCHISE_ITENSCATALOGO",
    "MYFRANCHISE_KPI_CATEGORIA",
    "MYFRANCHISE_KPI_REDE",
    "MYFRANCHISE_KPI_UNIDADE",
    "MYFRANCHISE_NOTIFICACOESCOMPLIANCE",
    "MYFRANCHISE_ORIGEMPEDIDO",
    "MYFRANCHISE_ORIGEMPEDIDO_TEXTS",
    "MYFRANCHISE_PEDIDOS_REPOSICAO",
    "MYFRANCHISE_PREVISAO_RECEITA",
    "MYFRANCHISE_PRIORIDADE",
    "MYFRANCHISE_PRIORIDADE_TEXTS",
    "MYFRANCHISE_PROCESSOSONBOARDING",
    "MYFRANCHISE_RECOMENDACOES",
    "MYFRANCHISE_REGIAO",
    "MYFRANCHISE_REGIAO_TEXTS",
    "MYFRANCHISE_REGRASCOMPLIANCE",
    "MYFRANCHISE_SAUDE_UNIDADE",
    "MYFRANCHISE_SAZONALIDADE_REGIONAL",
    "MYFRANCHISE_SEVERIDADE",
    "MYFRANCHISE_SEVERIDADE_TEXTS",
    "MYFRANCHISE_STATUSALERTA",
    "MYFRANCHISE_STATUSALERTA_TEXTS",
    "MYFRANCHISE_STATUSAPROVACAO",
    "MYFRANCHISE_STATUSAPROVACAO_TEXTS",
    "MYFRANCHISE_STATUSCATALOGO",
    "MYFRANCHISE_STATUSCATALOGO_TEXTS",
    "MYFRANCHISE_STATUSCONTRATO",
    "MYFRANCHISE_STATUSCONTRATO_TEXTS",
    "MYFRANCHISE_STATUSDESVIO",
    "MYFRANCHISE_STATUSDESVIO_TEXTS",
    "MYFRANCHISE_STATUSDOCUMENTO",
    "MYFRANCHISE_STATUSDOCUMENTO_TEXTS",
    "MYFRANCHISE_STATUSESTOQUE",
    "MYFRANCHISE_STATUSESTOQUE_TEXTS",
    "MYFRANCHISE_STATUSFRANQUEADO",
    "MYFRANCHISE_STATUSFRANQUEADO_TEXTS",
    "MYFRANCHISE_STATUSKPI",
    "MYFRANCHISE_STATUSKPI_TEXTS",
    "MYFRANCHISE_STATUSNOTIFICACAO",
    "MYFRANCHISE_STATUSNOTIFICACAO_TEXTS",
    "MYFRANCHISE_STATUSONBOARDING",
    "MYFRANCHISE_STATUSONBOARDING_TEXTS",
    "MYFRANCHISE_STATUSPEDIDOREP",
    "MYFRANCHISE_STATUSPEDIDOREP_TEXTS",
    "MYFRANCHISE_STATUSRECOMENDACAO",
    "MYFRANCHISE_STATUSRECOMENDACAO_TEXTS",
    "MYFRANCHISE_STATUSTAREFA",
    "MYFRANCHISE_STATUSTAREFA_TEXTS",
    "MYFRANCHISE_STATUSUNIDADE",
    "MYFRANCHISE_STATUSUNIDADE_TEXTS",
    "MYFRANCHISE_SUBSTITUTOS",
    "MYFRANCHISE_TAREFASONBOARDING",
    "MYFRANCHISE_TIPOALERTA",
    "MYFRANCHISE_TIPOALERTA_TEXTS",
    "MYFRANCHISE_TIPODESVIO",
    "MYFRANCHISE_TIPODESVIO_TEXTS",
    "MYFRANCHISE_TIPODOCUMENTO",
    "MYFRANCHISE_TIPODOCUMENTO_TEXTS",
    "MYFRANCHISE_TIPORECOMENDACAO",
    "MYFRANCHISE_TIPORECOMENDACAO_TEXTS",
    "MYFRANCHISE_UNIDADES",
    "MYFRANCHISE_VENDAPRATICADA",
]


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--host",     default=os.environ.get("HANA_HOST", "70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com"))
    p.add_argument("--port",     default=int(os.environ.get("HANA_PORT", "443")), type=int)
    p.add_argument("--user",     default=os.environ.get("HANA_USER", "DBADMIN"))
    p.add_argument("--password", default=os.environ.get("HANA_PASSWORD", ""))
    return p.parse_args()


def sync(conn):
    cur = conn.cursor()

    # Ensure MF schema exists
    cur.execute(f"SELECT COUNT(*) FROM SYS.SCHEMAS WHERE SCHEMA_NAME = '{MF_SCHEMA}'")
    if cur.fetchone()[0] == 0:
        cur.execute(f'CREATE SCHEMA "{MF_SCHEMA}"')
        print(f"Created schema {MF_SCHEMA}")

    # Get existing tables in MF schema
    cur.execute(f"SELECT TABLE_NAME FROM SYS.TABLES WHERE SCHEMA_NAME = '{MF_SCHEMA}'")
    existing = {r[0] for r in cur.fetchall()}

    created = 0
    synced  = 0
    skipped = 0

    for table in TABLES:
        src = f'"{HDI_SCHEMA}"."{table}"'
        dst = f'"{MF_SCHEMA}"."{table}"'

        # Check table exists in HDI
        cur.execute(f"SELECT COUNT(*) FROM SYS.TABLES WHERE SCHEMA_NAME='{HDI_SCHEMA}' AND TABLE_NAME='{table}'")
        if cur.fetchone()[0] == 0:
            print(f"  SKIP {table} — not found in HDI schema")
            skipped += 1
            continue

        # Drop + recreate if exists
        if table in existing:
            cur.execute(f'DROP TABLE {dst}')

        # Create table with same structure
        cur.execute(f'CREATE TABLE {dst} AS (SELECT * FROM {src} WHERE 1=0)')
        created += 1

        # Insert all data
        cur.execute(f'INSERT INTO {dst} SELECT * FROM {src}')
        rows = cur.rowcount
        print(f"  {table}: {rows} rows")
        synced += 1

    conn.commit()
    print(f"\nDone. Created: {created}, Synced: {synced}, Skipped: {skipped}")


def main():
    args = parse_args()
    if not args.password:
        args.password = input("DBADMIN password: ")

    print(f"Connecting to {args.host}:{args.port} as {args.user}...")
    conn = dbapi.connect(
        address=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        encrypt=True,
        sslValidateCertificate=False
    )
    print(f"Connected. Syncing {HDI_SCHEMA} → {MF_SCHEMA}...\n")
    sync(conn)
    conn.close()


if __name__ == "__main__":
    main()
