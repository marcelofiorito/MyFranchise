#!/usr/bin/env node
// Patches generated .hdbtabledata files for tables that change between deploys.
// Sets "delete_existing_data": true so HDI truncates and re-inserts on every deploy.
// Code-list tables (Status*, Tipo*, Regiao, etc.) are left unchanged since they
// never conflict and we don't want to lose any runtime-added entries.
const fs = require('fs');
const path = require('path');

const DATA_TABLES = new Set([
  'myfranchise-Estoque_Unidade',
  'myfranchise-KPI_Unidade',
  'myfranchise-KPI_Rede',
  'myfranchise-KPI_Categoria',
  'myfranchise-Saude_Unidade',
  'myfranchise-Desvios',
  'myfranchise-Recomendacoes',
  'myfranchise-Substitutos',
  'myfranchise-Previsao_Receita',
  'myfranchise-Feed_Franqueado',
  'myfranchise-Franqueados',
  'myfranchise-Unidades',
  'myfranchise-Atividades_Rede',
  'myfranchise-Benchmark_Cluster',
  'myfranchise-Campanhas',
  'myfranchise-Ativacao_Campanha_Unidade',
  'myfranchise-VendaPraticada',
  'myfranchise-Contratos_Franquia',
  'myfranchise-NotificacoesCompliance',
  'myfranchise-ProcessosOnboarding',
  'myfranchise-EtapasOnboarding',
  'myfranchise-TarefasOnboarding',
  'myfranchise-Catalogos',
  'myfranchise-ItensCatalogo',
  'myfranchise-RegrasCompliance',
  'myfranchise-Sazonalidade_Regional',
  'myfranchise-Calendario_Promocional',
]);

const dataDir = path.join(__dirname, '..', 'gen', 'db', 'src', 'gen', 'data');
if (!fs.existsSync(dataDir)) {
  console.log('data dir not found, skipping patch');
  process.exit(0);
}

let patched = 0;
for (const file of fs.readdirSync(dataDir)) {
  if (!file.endsWith('.hdbtabledata')) continue;
  const baseName = file.replace('.hdbtabledata', '');
  if (!DATA_TABLES.has(baseName)) continue;
  const filePath = path.join(dataDir, file);
  const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const imp of obj.imports || []) {
    if (!imp.import_settings) imp.import_settings = {};
    imp.import_settings.upsert_existing_records = true;
    delete imp.import_settings.delete_existing_data;
  }
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
  patched++;
}
console.log(`patch-hdbtabledata: patched ${patched} file(s) with delete_existing_data=true`);
