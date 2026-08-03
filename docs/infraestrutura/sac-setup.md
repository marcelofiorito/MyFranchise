# SAC Live Connection Setup — RunMyFranchise

**HANA Cloud:** `70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com`  
**HDI Schema:** `2177F43B75D34848AE3EA84FAB461E66`  
**BTP Subaccount:** `sa-build-platform-org / DEV` (us10)  
**SAC Tenant:** `https://demo-presalesbrazil.us10.sapanalytics.cloud/`

---

## Arquitetura

```
HANA Cloud (HDI)
  └── Synonyms → tabelas CAP
  └── Calculation Views CUBE (a criar no BAS)
        ↓
  HANA Analytics Adapter — HAA (CF app, us10)
        ↓
  BTP Destination → HAA endpoint
        ↓
  SAC Live Connection (demo-presalesbrazil.us10)
        ↓
  SAC Model + Story
```

---

## Passo 1 — Deploy dos artefatos HDI

Os arquivos já estão no projeto em `db/src/analytics/`:

```
synonyms.hdbsynonym       ← aponta para as 5 tabelas CAP
analytics_grants.hdbgrants ← permissão SELECT no schema HDI
```

Deploy via:
```bash
mbt build && cf deploy mta_archives/myfranchise_1.0.0.mtar
```

> ⚠️ Os grants `.hdbgrants` requerem que o service name `SAP_HANA_HDI` corresponda ao nome do binding HANA no `mta.yaml`. Verificar se é `myfranchise-db`.

---

## Passo 2 — Criar Calculation Views no BAS

Abrir o projeto no **SAP Business Application Studio** com extensão HANA:

1. Criar `db/src/analytics/CV_NETWORK_HEALTH.hdbcalculationview`
   - Type: **CUBE**
   - Base: `SYN_SAUDE_DASHBOARD` JOIN `SYN_UNIDADES`
   - Dimensions: `UNIDADE_ID`, `NOME`, `CIDADE`, `REGIAO_CODE`, `CLUSTER_CODE`
   - Measures: `SCORESAUDE`, `COMPLIANCEPCT`, `PERFORMANCEPCT`

2. Criar `db/src/analytics/CV_KPI_PERFORMANCE.hdbcalculationview`
   - Type: **CUBE**
   - Base: `SYN_KPI_UNIDADE` JOIN `SYN_UNIDADES`
   - Dimensions: `UNIDADE_ID`, `NOME`, `REGIAO_CODE`, `PERIODO`
   - Measures: `FATURAMENTO`, `TICKETMEDIO`, `CRESCIMENTOMOM`

3. Criar `db/src/analytics/CV_INVENTORY_STATUS.hdbcalculationview`
   - Type: **CUBE**
   - Base: `SYN_ESTOQUE_UNIDADE`
   - Dimensions: `UNIDADE_ID`, `SKU`, `NOMEPRODUTO`, `CATEGORIA`, `REGIAO_CODE`
   - Measures: `SALDOATUAL`, `COBERTURADIASF`, `ESTOQUECRITICALITY`

> ⚠️ Somente views do tipo **CUBE** ficam visíveis no SAC.

---

## Passo 3 — Deploy do HAA (HANA Analytics Adapter)

O HAA expõe o InA service do HANA Cloud para o SAC.

### 3.1 Download
```
https://tools.hana.ondemand.com/#hanatools
→ "SAP HANA Analytics Adapter for Cloud Foundry"
```

### 3.2 Deploy no CF
```bash
cf push haa-myfranchise \
  -p haa.zip \
  -m 512M \
  --no-start

cf bind-service haa-myfranchise myfranchise-db
cf start haa-myfranchise
```

### 3.3 Verificar endpoint
```
https://haa-myfranchise.cfapps.us10.hana.ondemand.com/sap/bc/ina/service
```
Deve retornar JSON com informações do serviço InA.

---

## Passo 4 — Destination no BTP

No BTP Cockpit → Connectivity → Destinations → New:

```
Name:            HAA-MyFranchise
Type:            HTTP
URL:             https://haa-myfranchise.cfapps.us10.hana.ondemand.com
Authentication:  OAuth2SAMLBearerAssertion
Audience:        https://haa-myfranchise.cfapps.us10.hana.ondemand.com
TokenServiceURL: https://build-platform-rfm61ms1.authentication.us10.hana.ondemand.com/oauth/token/alias/build-platform-rfm61ms1.aws-live
```

Propriedades adicionais:
```
WebIDEEnabled:   true
WebIDEUsage:     hana_catalog
sap-client:      (deixar vazio para HANA Cloud)
```

---

## Passo 5 — Trusted IDP entre BTP e SAC

Para que o SAC (tenant `demo-presalesbrazil`) confie no IDP do BTP (`sa-build-platform-org`):

### No SAC (System → Administration → App Integration):
1. Aba **Trusted Identity Providers**
2. Add → importar o metadata XML do IDP do BTP
   - URL do metadata: `https://build-platform-rfm61ms1.accounts.ondemand.com/saml2/metadata`

### No BTP (Security → Trust Configuration):
1. Adicionar o SAC como service provider confiável
2. Baixar metadata do SAC: `https://demo-presalesbrazil.us10.sapanalytics.cloud/sap/saml2/sp/metadata`
3. Importar no BTP Trust Configuration

---

## Passo 6 — Live Connection no SAC

No SAC:
1. **Connections → New Connection**
2. Tipo: **SAP HANA** → **Live Data Connection**
3. Connection Type: **Direct** (usa HAA)
4. Host: `haa-myfranchise.cfapps.us10.hana.ondemand.com`
5. HTTPS Port: `443`
6. Authentication: **SAML SSO**

Testar conexão → deve listar as Calculation Views CUBE criadas.

---

## Passo 7 — Criar Modelo e Story no SAC

1. **New Model → Get data → Live Data → [conexão HAA]**
2. Selecionar `CV_NETWORK_HEALTH` → Create Model
3. **New Story → Add Chart**
   - Donut: `SCORECRITICALITY` como dimension, count como measure
   - Bar: `SCORESAUDE` por `NOME` (top 10 lojas)
   - KPI tile: `AVG(SCORESAUDE)` da rede

---

## Entidades disponíveis após deploy

| Calculation View | Entidade CAP | Uso no SAC |
|---|---|---|
| `CV_NETWORK_HEALTH` | `Saude_Unidade` + `Unidades` | Network Panel — donut + score por loja |
| `CV_KPI_PERFORMANCE` | `KPI_Unidade` + `Unidades` | Performance financeira — revenue trends |
| `CV_INVENTORY_STATUS` | `Estoque_Unidade` | Inventory — cobertura por região/SKU |

---

## Status

- [x] Synonyms criados (`db/src/analytics/synonyms.hdbsynonym`)
- [x] Grants criados (`db/src/analytics/analytics_grants.hdbgrants`)
- [ ] Calculation Views (criar no BAS — requer interface gráfica)
- [ ] HAA deploy
- [ ] BTP Destination
- [ ] Trusted IDP BTP ↔ SAC
- [ ] SAC Live Connection
- [ ] SAC Model + Story
