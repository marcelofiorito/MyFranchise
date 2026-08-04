# SAC Live Connection Setup — RunMyFranchise

**HANA Cloud:** `70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com`  
**HDI Schema:** `2177F43B75D34848AE3EA84FAB461E66`  
**BTP Subaccount:** `sa-build-platform-org / DEV` (us10)  
**SAC Tenant:** `https://demo-presalesbrazil.us10.sapanalytics.cloud/`

---

## Status

- [x] Trusted IDP configurado no SAC (BTP como IDP)
- [x] Conexão `MFRANCHISE` criada no SAC (usuário `_RT`)
- [x] `access_role` do HDI concedido ao `_RT` via DBADMIN
- [x] Estrutura correta do projeto HDI identificada (`exemplo/MyFranchiseDB.tar`)
- [ ] Calculation Views CUBE criadas e configuradas no BAS
- [ ] Deploy das Calculation Views no HDI container
- [ ] SAC Live Data Model criado

---

## Estrutura correta do projeto HDI (via BAS wizard)

```
myfranchise-analytics/
  db/
    src/
      .hdiconfig          ← gerado pelo BAS (inclui minimum_feature_version: "1015")
      .hdinamespace       ← namespace do projeto
      CV_*.hdbcalculationview  ← Calculation Views tipo CUBE
    .env                  ← credenciais HDI (gerado pelo Bind All)
    package.json          ← @sap/hdi-deploy + @sap/hana-client
  mta.yaml
```

## .hdinamespace
```json
{
    "name": "myfranchise",
    "subfolder": "append"
}
```

## package.json (db/)
```json
{
  "name": "deploy",
  "dependencies": {
    "@sap/hdi-deploy": "^5.*",
    "@sap/hana-client": "^2.*"
  },
  "scripts": {
    "start": "node node_modules/@sap/hdi-deploy/deploy.js"
  }
}
```

---

## Como criar o projeto no BAS

1. BAS → **New Project from Template** → **SAP HANA Database Project**
2. Preenche nome: `myfranchise-analytics`
3. **Bind to HDI Container**: seleciona `myfranchise-db`
4. O BAS cria a estrutura com `.hdiconfig`, `.hdinamespace`, `package.json` e `.env` automaticamente

---

## Como criar Calculation Views no BAS

1. Com o projeto aberto no BAS
2. **Command Palette → Create SAP HANA Database Artifact**
3. Path: `db/src`
4. Type: **Calculation View (hdbcalculationview)**
5. Data Category: **CUBE**
6. Star Join: **No**
7. O editor gráfico abre — adicione datasources (tabelas do HDI via sinônimos)

---

## Calculation Views planejadas

| View | Tabelas base | Dimensions | Measures |
|---|---|---|---|
| `CV_NETWORK_HEALTH_CUBE` | `MYFRANCHISE_SAUDE_UNIDADE` + `MYFRANCHISE_UNIDADES` | UNIDADE_ID, REGION, CLUSTER | HEALTH_SCORE, COMPLIANCE_PCT |
| `CV_KPI_PERFORMANCE_CUBE` | `MYFRANCHISE_KPI_UNIDADE` + `MYFRANCHISE_UNIDADES` | UNIDADE_ID, PERIODO, REGION | REVENUE, AVG_TICKET, NPS |
| `CV_INVENTORY_CUBE` | `MYFRANCHISE_ESTOQUE_UNIDADE` | UNIDADE_ID, SKU, CATEGORY | CURRENT_STOCK, COVERAGE_DAYS |

---

## Grant access_role ao usuário RT (feito)

```sql
-- Executado como DBADMIN no HANA Database Explorer
GRANT "2177F43B75D34848AE3EA84FAB461E66::access_role" 
  TO "2177F43B75D34848AE3EA84FAB461E66_69KR5XWBL7FPU3Y9DLP4VIT7D_RT";
```

---

## SAC — Trusted IDP (feito)

- **Name:** `BTP build-platform-rfm61ms1`
- **Provider Name:** `https://build-platform-rfm61ms1.authentication.us10.hana.ondemand.com`
- **Signing Certificate:** em `docs/infraestrutura/btp_idp_metadata.xml`

---

## SAC — Conexão MFRANCHISE (feita)

- **Type:** SAP HANA (Live)
- **Host:** `70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com`
- **Port:** `443`
- **User:** `_RT` do binding HDI

