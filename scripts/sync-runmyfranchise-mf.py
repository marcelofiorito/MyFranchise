#!/usr/bin/env python3
"""
Sync dual-connection: RT user lê do HDI, DBADMIN escreve no RUNMYFRANCHISE_MF.
"""
import subprocess, json
from hdbcli import dbapi

HDI_SCHEMA = "2177F43B75D34848AE3EA84FAB461E66"
MF_SCHEMA  = "RUNMYFRANCHISE_MF"

TABLES = [
    "MYFRANCHISE_ALERTAS","MYFRANCHISE_APROVACOESONBOARDING","MYFRANCHISE_ATIVACAO_CAMPANHA_UNIDADE",
    "MYFRANCHISE_ATIVIDADES_REDE","MYFRANCHISE_BENCHMARK_CLUSTER","MYFRANCHISE_CALENDARIO_PROMOCIONAL",
    "MYFRANCHISE_CAMPANHAS","MYFRANCHISE_CATALOGOS","MYFRANCHISE_CLUSTER","MYFRANCHISE_CLUSTER_TEXTS",
    "MYFRANCHISE_CONTRATOS_FRANQUIA","MYFRANCHISE_DESVIOS","MYFRANCHISE_DOCUMENTOSONBOARDING",
    "MYFRANCHISE_ESTOQUE_UNIDADE","MYFRANCHISE_ETAPASONBOARDING","MYFRANCHISE_FEED_FRANQUEADO",
    "MYFRANCHISE_FRANQUEADOS","MYFRANCHISE_ITENSCATALOGO","MYFRANCHISE_KPI_CATEGORIA",
    "MYFRANCHISE_KPI_REDE","MYFRANCHISE_KPI_UNIDADE","MYFRANCHISE_NOTIFICACOESCOMPLIANCE",
    "MYFRANCHISE_ORIGEMPEDIDO","MYFRANCHISE_ORIGEMPEDIDO_TEXTS","MYFRANCHISE_PEDIDOS_REPOSICAO",
    "MYFRANCHISE_PREVISAO_RECEITA","MYFRANCHISE_PRIORIDADE","MYFRANCHISE_PRIORIDADE_TEXTS",
    "MYFRANCHISE_PROCESSOSONBOARDING","MYFRANCHISE_RECOMENDACOES","MYFRANCHISE_REGIAO",
    "MYFRANCHISE_REGIAO_TEXTS","MYFRANCHISE_REGRASCOMPLIANCE","MYFRANCHISE_SAUDE_UNIDADE",
    "MYFRANCHISE_SAZONALIDADE_REGIONAL","MYFRANCHISE_SEVERIDADE","MYFRANCHISE_SEVERIDADE_TEXTS",
    "MYFRANCHISE_STATUSALERTA","MYFRANCHISE_STATUSALERTA_TEXTS","MYFRANCHISE_STATUSAPROVACAO",
    "MYFRANCHISE_STATUSAPROVACAO_TEXTS","MYFRANCHISE_STATUSCATALOGO","MYFRANCHISE_STATUSCATALOGO_TEXTS",
    "MYFRANCHISE_STATUSCONTRATO","MYFRANCHISE_STATUSCONTRATO_TEXTS","MYFRANCHISE_STATUSDESVIO",
    "MYFRANCHISE_STATUSDESVIO_TEXTS","MYFRANCHISE_STATUSDOCUMENTO","MYFRANCHISE_STATUSDOCUMENTO_TEXTS",
    "MYFRANCHISE_STATUSESTOQUE","MYFRANCHISE_STATUSESTOQUE_TEXTS","MYFRANCHISE_STATUSFRANQUEADO",
    "MYFRANCHISE_STATUSFRANQUEADO_TEXTS","MYFRANCHISE_STATUSKPI","MYFRANCHISE_STATUSKPI_TEXTS",
    "MYFRANCHISE_STATUSNOTIFICACAO","MYFRANCHISE_STATUSNOTIFICACAO_TEXTS","MYFRANCHISE_STATUSONBOARDING",
    "MYFRANCHISE_STATUSONBOARDING_TEXTS","MYFRANCHISE_STATUSPEDIDOREP","MYFRANCHISE_STATUSPEDIDOREP_TEXTS",
    "MYFRANCHISE_STATUSRECOMENDACAO","MYFRANCHISE_STATUSRECOMENDACAO_TEXTS","MYFRANCHISE_STATUSTAREFA",
    "MYFRANCHISE_STATUSTAREFA_TEXTS","MYFRANCHISE_STATUSUNIDADE","MYFRANCHISE_STATUSUNIDADE_TEXTS",
    "MYFRANCHISE_SUBSTITUTOS","MYFRANCHISE_TAREFASONBOARDING","MYFRANCHISE_TIPOALERTA",
    "MYFRANCHISE_TIPOALERTA_TEXTS","MYFRANCHISE_TIPODESVIO","MYFRANCHISE_TIPODESVIO_TEXTS",
    "MYFRANCHISE_TIPODOCUMENTO","MYFRANCHISE_TIPODOCUMENTO_TEXTS","MYFRANCHISE_TIPORECOMENDACAO",
    "MYFRANCHISE_TIPORECOMENDACAO_TEXTS","MYFRANCHISE_UNIDADES","MYFRANCHISE_VENDAPRATICADA",
    "MYFRANCHISE_PREVISAO_RECEITA","MYFRANCHISE_FEED_FRANQUEADO",
]

# RT credentials from CF service key
result = subprocess.run(["cf", "service-key", "myfranchise-db", "SharedDevKey"], capture_output=True, text=True)
lines = result.stdout.strip().split("\n")
creds = json.loads("\n".join(lines[2:]))["credentials"]

conn_rt = dbapi.connect(address=creds["host"], port=int(creds["port"]),
    user=creds["user"], password=creds["password"],
    encrypt=True, sslValidateCertificate=False)

import os
dbadmin_pass = os.environ.get("HANA_DBADMIN_PASSWORD")
if not dbadmin_pass:
    raise SystemExit("ERROR: HANA_DBADMIN_PASSWORD env var not set")

conn_db = dbapi.connect(
    address="70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com",
    port=443, user="DBADMIN", password=dbadmin_pass,
    encrypt=True, sslValidateCertificate=False)

cur_rt = conn_rt.cursor()
cur_db = conn_db.cursor()

print("Syncing " + HDI_SCHEMA + " -> " + MF_SCHEMA)
print("Tables: " + str(len(TABLES)))
print()

total_rows = 0
for table in TABLES:
    # Get column metadata via RT user
    cur_rt.execute(
        "SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE "
        "FROM SYS.TABLE_COLUMNS "
        "WHERE SCHEMA_NAME = '" + HDI_SCHEMA + "' AND TABLE_NAME = '" + table + "' "
        "ORDER BY POSITION"
    )
    col_info = cur_rt.fetchall()
    if not col_info:
        print("  SKIP " + table + " — no columns found")
        continue

    # Build CREATE TABLE DDL
    col_ddl_parts = []
    col_names = []
    for cname, dtype, length, scale, nullable in col_info:
        col_names.append(cname)
        null_str = "" if nullable == "TRUE" else " NOT NULL"
        if dtype in ("NVARCHAR", "VARCHAR", "VARBINARY", "ALPHANUM", "SHORTTEXT"):
            col_ddl_parts.append('"' + cname + '" ' + dtype + "(" + str(length) + ")" + null_str)
        elif dtype == "DECIMAL" and scale is not None:
            col_ddl_parts.append('"' + cname + '" ' + dtype + "(" + str(length) + "," + str(scale) + ")" + null_str)
        else:
            col_ddl_parts.append('"' + cname + '" ' + dtype + null_str)

    # Drop existing table in MF
    try:
        cur_db.execute('DROP TABLE "' + MF_SCHEMA + '"."' + table + '"')
    except Exception:
        pass

    ddl = 'CREATE TABLE "' + MF_SCHEMA + '"."' + table + '" (' + ", ".join(col_ddl_parts) + ")"
    cur_db.execute(ddl)

    # Read all data from HDI via RT
    cur_rt.execute('SELECT * FROM "' + HDI_SCHEMA + '"."' + table + '"')
    rows = cur_rt.fetchall()

    # Insert into MF via DBADMIN
    if rows:
        cols_quoted = ", ".join('"' + c + '"' for c in col_names)
        placeholders = ", ".join(["?"] * len(col_names))
        cur_db.executemany(
            'INSERT INTO "' + MF_SCHEMA + '"."' + table + '" (' + cols_quoted + ') VALUES (' + placeholders + ")",
            rows
        )

    print("  " + table + ": " + str(len(rows)) + " rows")
    total_rows += len(rows)

conn_db.commit()
conn_rt.close()
conn_db.close()
print("\nDone. " + str(len(TABLES)) + " tables, " + str(total_rows) + " total rows synced.")
