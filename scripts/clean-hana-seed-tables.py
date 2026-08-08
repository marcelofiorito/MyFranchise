#!/usr/bin/env python3
"""
Script temporário: limpa dados das tabelas de seed no HANA antes do re-deploy.
Executa DELETE em todas as tabelas que têm seed CSV e que causam unique-constraint
no HDI deployer. Uso único — depois o deploy normal com delete_existing_data funciona.
"""
import subprocess, json, sys

# Obter credenciais
result = subprocess.run(
    ["cf", "service-key", "myfranchise-db", "SharedDevKey"],
    capture_output=True, text=True
)
lines = result.stdout.strip().split('\n')
creds_text = '\n'.join(lines[2:])  # skip header lines
data = json.loads(creds_text)
creds = data['credentials']

host     = creds['host']
port     = int(creds['port'])
user     = creds['user']
password = creds['password']
schema   = creds['schema']

try:
    from hdbcli import dbapi
except ImportError:
    print("Installing hdbcli...")
    subprocess.run([sys.executable, "-m", "pip", "install", "hdbcli", "-q"])
    from hdbcli import dbapi

conn = dbapi.connect(
    address=host,
    port=port,
    user=user,
    password=password,
    encrypt=True,
    sslValidateCertificate=False
)

TABLES = [
    "MYFRANCHISE_ESTOQUE_UNIDADE",
    "MYFRANCHISE_KPI_UNIDADE",
    "MYFRANCHISE_KPI_REDE",
    "MYFRANCHISE_KPI_CATEGORIA",
    "MYFRANCHISE_SAUDE_UNIDADE",
    "MYFRANCHISE_DESVIOS",
    "MYFRANCHISE_RECOMENDACOES",
    "MYFRANCHISE_SUBSTITUTOS",
    "MYFRANCHISE_PREVISAO_RECEITA",
    "MYFRANCHISE_FEED_FRANQUEADO",
    "MYFRANCHISE_FRANQUEADOS",
    "MYFRANCHISE_UNIDADES",
    "MYFRANCHISE_ATIVIDADES_REDE",
    "MYFRANCHISE_BENCHMARK_CLUSTER",
    "MYFRANCHISE_CAMPANHAS",
    "MYFRANCHISE_ATIVACAO_CAMPANHA_UNIDADE",
    "MYFRANCHISE_VENDAPRATICADA",
    "MYFRANCHISE_CONTRATOS_FRANQUIA",
    "MYFRANCHISE_NOTIFICACOESCOMPLIANCE",
    "MYFRANCHISE_PROCESSOSONBOARDING",
    "MYFRANCHISE_ETAPASONBOARDING",
    "MYFRANCHISE_TAREFASONBOARDING",
    "MYFRANCHISE_CATALOGOS",
    "MYFRANCHISE_ITENSCATALOGO",
    "MYFRANCHISE_REGRAS_COMPLIANCE",
    "MYFRANCHISE_SAZONALIDADE_REGIONAL",
    "MYFRANCHISE_CALENDARIO_PROMOCIONAL",
]

cursor = conn.cursor()
for table in TABLES:
    try:
        cursor.execute(f'DELETE FROM "{schema}"."{table}"')
        print(f"  DELETE {table}: {cursor.rowcount} rows removed")
    except Exception as e:
        print(f"  SKIP {table}: {e}")

conn.commit()
cursor.close()
conn.close()
print("\nDone. Run cf deploy now.")
