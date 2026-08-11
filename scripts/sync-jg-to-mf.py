#!/usr/bin/env python3
"""
Lê tabelas do schema RUNMYFRANCHISE_JG (Juliana Genova) e recria no RUNMYFRANCHISE_MF.
RUNMYFRANCHISE_JG: somente leitura — nenhuma escrita ou alteração.
RUNMYFRANCHISE_MF: DROP + CREATE + INSERT para cada tabela encontrada no JG.

Uso:
  HANA_DBADMIN_PASSWORD='...' python3 scripts/sync-jg-to-mf.py
"""
import os, sys

try:
    from hdbcli import dbapi
except ImportError:
    sys.exit("ERROR: hdbcli not installed — pip install hdbcli")

HANA_HOST = "70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com"
HANA_PORT = 443
JG_SCHEMA = "RUNMYFRANCHISE_JG"
MF_SCHEMA = "RUNMYFRANCHISE_MF"

dbadmin_pass = os.environ.get("HANA_DBADMIN_PASSWORD")
if not dbadmin_pass:
    sys.exit("ERROR: HANA_DBADMIN_PASSWORD env var not set")

print(f"Connecting to HANA as DBADMIN...")
conn = dbapi.connect(
    address=HANA_HOST, port=HANA_PORT,
    user="DBADMIN", password=dbadmin_pass,
    encrypt=True, sslValidateCertificate=False
)
cur = conn.cursor()
print("Connected.\n")

# 1. Discover all tables in JG schema
cur.execute(
    "SELECT TABLE_NAME FROM SYS.TABLES "
    f"WHERE SCHEMA_NAME = '{JG_SCHEMA}' AND TABLE_TYPE IN ('ROW', 'COLUMN') "
    "ORDER BY TABLE_NAME"
)
tables = [row[0] for row in cur.fetchall()]

if not tables:
    sys.exit(f"ERROR: No tables found in schema {JG_SCHEMA}. Check schema name and DBADMIN access.")

print(f"Found {len(tables)} tables in {JG_SCHEMA}:")
for t in tables:
    print(f"  {t}")
print()

# 2. Sync each table: JG (read) -> MF (write)
total_rows = 0
errors = []

for table in tables:
    try:
        # Get column metadata from JG
        cur.execute(
            "SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE "
            "FROM SYS.TABLE_COLUMNS "
            f"WHERE SCHEMA_NAME = '{JG_SCHEMA}' AND TABLE_NAME = '{table}' "
            "ORDER BY POSITION"
        )
        col_info = cur.fetchall()
        if not col_info:
            print(f"  SKIP {table} — no columns found")
            continue

        col_names = []
        col_ddl_parts = []
        for cname, dtype, length, scale, nullable in col_info:
            col_names.append(cname)
            null_str = "" if nullable == "TRUE" else " NOT NULL"
            if dtype in ("NVARCHAR", "VARCHAR", "VARBINARY", "ALPHANUM", "SHORTTEXT"):
                col_ddl_parts.append(f'"{cname}" {dtype}({length}){null_str}')
            elif dtype == "DECIMAL" and scale is not None:
                col_ddl_parts.append(f'"{cname}" {dtype}({length},{scale}){null_str}')
            else:
                col_ddl_parts.append(f'"{cname}" {dtype}{null_str}')

        # Read data from JG (READ ONLY)
        cur.execute(f'SELECT * FROM "{JG_SCHEMA}"."{table}"')
        rows = cur.fetchall()

        # Drop existing table in MF if exists
        try:
            cur.execute(f'DROP TABLE "{MF_SCHEMA}"."{table}"')
        except Exception:
            pass

        # Create table in MF
        ddl = f'CREATE TABLE "{MF_SCHEMA}"."{table}" ({", ".join(col_ddl_parts)})'
        cur.execute(ddl)

        # Insert rows into MF
        if rows:
            cols_quoted = ", ".join(f'"{c}"' for c in col_names)
            placeholders = ", ".join(["?"] * len(col_names))
            cur.executemany(
                f'INSERT INTO "{MF_SCHEMA}"."{table}" ({cols_quoted}) VALUES ({placeholders})',
                rows
            )

        conn.commit()
        print(f"  OK  {table}: {len(rows)} rows")
        total_rows += len(rows)

    except Exception as e:
        errors.append((table, str(e)))
        print(f"  ERR {table}: {e}")
        try:
            conn.rollback()
        except Exception:
            pass

cur.close()
conn.close()

print(f"\n{'='*60}")
print(f"Done. {len(tables) - len(errors)} tables synced, {total_rows} total rows.")
if errors:
    print(f"\nErrors ({len(errors)}):")
    for table, err in errors:
        print(f"  {table}: {err}")
else:
    print("No errors.")
