#!/usr/bin/env node
// Adds "upsert_existing_records": true to all generated .hdbtabledata files.
// Run after cds build --production so HDI does not fail when seed data already
// exists in the container from a previous deploy.
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'gen', 'db', 'src', 'gen', 'data');
if (!fs.existsSync(dataDir)) {
  console.log('data dir not found, skipping patch');
  process.exit(0);
}

let patched = 0;
for (const file of fs.readdirSync(dataDir)) {
  if (!file.endsWith('.hdbtabledata')) continue;
  const filePath = path.join(dataDir, file);
  const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  for (const imp of obj.imports || []) {
    if (!imp.import_settings) imp.import_settings = {};
    if (!imp.import_settings.upsert_existing_records) {
      imp.import_settings.upsert_existing_records = true;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
    patched++;
  }
}
console.log(`patch-hdbtabledata: patched ${patched} file(s) with upsert_existing_records=true`);
