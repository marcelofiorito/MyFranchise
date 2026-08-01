# RunMyFranchise — Technical Specification

[🇧🇷 Português](SPEC.md) · **🇬🇧 English**

> Version 1.0 · July 2026  
> Use this document as primary context for implementation with Claude Code.

---

## 1. Project Context

### What it is

SAP BTP platform for managing franchise networks. It centralizes the network view, automatically detects compliance deviations, provides a dashboard to the franchisee, and standardizes the onboarding of new units.

### Competition

- **Event:** Dragons' Den: Learn to Win Edition 2026 — SAP Solution Advisory
- **Presentation:** 15 min live demo + 5 min Q&A. No screenshots.
- **Date:** August 26, 2026
- **Highest-weighted criterion:** Live Demo Quality (20%)

### Demo persona

**Alexandre Mendes** — Director of Operations and Expansion, a network of 280 fashion/lifestyle stores. Wants to double the network in 3 years. Problem: each franchisee is an island, KPIs arrive late, compliance is manual, onboarding takes months.

### Demo scenario — Store 147

Store 147 (Porto Alegre, Standard cluster) is the unit used in the live demo blocks:
- Health Score: **32/100** (critical — red in the ALP)
- 4 deviations detected: SKU-004 Tênis Casual (-14.3% Alta), SKU-011 Boné Aba Curva (-24.1% Alta), SKU-003 Vestido Midi (-8.8% Média), SKU-999 unauthorized product (Mix Alta)
- Franchisee: Roberto Mendes (`unidade_ID: 'u147'`, `cluster: 'STD'`)
- KPIs Jan–Jun/2026 declining: R$ 189k → R$ 162k
- 3 pre-generated AI recommendations
- 3 compliance notifications sent

---

## 2. Stack and Architecture Decisions

### Decisions made — do not change

| Decision | Choice |
|---|---|
| BTP Runtime | Cloud Foundry |
| Backend | SAP CAP (Node.js), OData V4, `@sap/cds ^10` |
| Database | SAP HANA Cloud (production) / in-memory SQLite (dev) |
| Franchisor Frontend | SAP Fiori Elements via SAP Build Work Zone |
| Franchisee Frontend | SAP Fiori Elements via SAP Build Work Zone |
| Mobile | Responsive via browser (PWA) — no native app |
| Theming | SAP UI Theme Designer (after the visual identity is defined) |
| Analytics MVP | HANA + Fiori (no SAC) |
| Analytics Phase 2 | SAP Analytics Cloud |
| SAP Datasphere | Out of MVP scope — mentioned in the architecture as an evolution |

### Versions

```json
{
  "@sap/cds": "^10",
  "@cap-js/sqlite": "^2",
  "express": "^4",
  "node": ">=20"
}
```

> **Note:** `@cap-js/sqlite@1.x` is incompatible with `@sap/cds@10`. Use `^2.1.3` or higher (uses `better-sqlite3`, compatible with Node 22). `@cap-js/sqlite@3` requires native `node:sqlite` available only in Node 22.5+ with the `--experimental-sqlite` flag.

---

## 3. Complete Data Model

**File:** `db/schema.cds`  
**Namespace:** `myfranchise`

### 3.1 Core Entities

```
Franqueados
  ID (cuid)
  razaoSocial : String(100)
  cnpj        : String(18)
  responsavel : String(100)
  email       : String(255)
  telefone    : String(20)
  status      : Association to StatusFranqueado  [code: Ativo|Inativo|Suspenso]
  unidades    : Composition of many Unidades on unidades.franqueado = $self

Unidades
  ID (cuid)
  codigo      : String(20)   — e.g.: '147'
  nome        : String(100)  — e.g.: 'Loja Porto Alegre'
  franqueado  : Association to Franqueados
  endereco    : String(255)
  cidade      : String(100)
  estado      : String(2)
  regiao      : Association to Regiao  [code: N|NE|CO|SE|S]
  cluster     : Association to Cluster  [code: FLG|STD|EXP]
  dataAbertura: Date
  status      : Association to StatusUnidade  [code: EmOnboarding|Ativa|Inativa|Suspensa]
  — NO back-associations (removed to avoid the resolveView bug in CAP 10)
```

> **IMPORTANT:** `Unidades` has no back-associations to `Saude_Unidade`, `KPI_Unidade`, `Alertas`, `Desvios`, or `ProcessosOnboarding`. Navigation is done via `$expand` or a direct query filtered by `unidade_ID`.

### 3.2 Network Module — Network Panel

```
KPI_Unidade
  ID (cuid)
  unidade      : Association to Unidades  — FK: unidade_ID
  periodo      : String(6)   — format YYYYMM e.g.: '202606'
  faturamento  : Decimal(15,2)
  ticketMedio  : Decimal(10,2)
  qtdTransacoes: Integer
  crescimentoMoM: Decimal(5,2)
  crescimentoYoY: Decimal(5,2)
  nps          : Decimal(4,1)
  statusKPI    : Association to StatusKPI  [code: Critico|Atencao|Normal|Destaque]

Saude_Unidade
  ID (cuid)
  unidade        : Association to Unidades  — FK: unidade_ID
  scoreSaude     : Decimal(5,2)   — 0 to 100
  compliancePct  : Decimal(5,2)   — % conformity
  performancePct : Decimal(5,2)   — % performance vs cluster
  qtdAlertasAlta : Integer
  qtdAlertasMedia: Integer
  dataAtualizacao: DateTime

Alertas
  ID (cuid)
  unidade   : Association to Unidades
  tipo      : Association to TipoAlerta  [code: Compliance|KPI|Contrato|Operacional]
  severidade: Association to Severidade  [code: Alta|Media|Baixa]
  descricao : String(500)
  status    : Association to StatusAlerta  [code: Aberto|EmAnalise|Resolvido]
  dataGeracao   : DateTime
  dataResolucao : DateTime

Benchmark_Cluster
  ID (cuid)
  cluster         : Association to Cluster
  periodo         : String(6)
  faturamentoMedio: Decimal(15,2)
  ticketMedioMedio: Decimal(10,2)
  crescimentoMedio: Decimal(5,2)
  npsMedio        : Decimal(4,1)
```

**Health Score Formula (to be implemented in the service handler):**
```
scoreSaude = (performancePct × 0.40) + (compliancePct × 0.40) + (scoreContrato × 0.20)

scoreContrato:
  100  if status = 'Ativo'
  60   if status = 'VencendoEm90dias'
  30   if status = 'VencendoEm30dias'
  0    if status = 'Vencido'

performancePct = (faturamento_unidade / faturamentoMedio_cluster) × 100  (cap 100)
```

### 3.3 Compliance Module — Governance

```
Catalogos
  ID (cuid)
  nome         : String(100)
  descricao    : String(500)
  vigenciaInicio: Date
  vigenciaFim  : Date
  status       : Association to StatusCatalogo  [code: Ativo|Inativo|Rascunho]
  itens        : Composition of many ItensCatalogo on itens.catalogo = $self

ItensCatalogo
  ID (cuid)
  catalogo     : Association to Catalogos
  sku          : String(50)
  nomeProduto  : String(150)
  categoria    : String(100)
  precoMinimo  : Decimal(10,2)
  precoMaximo  : Decimal(10,2)
  precoSugerido: Decimal(10,2)
  ativo        : Boolean default true

VendaPraticada
  ID (cuid)
  unidade      : Association to Unidades
  periodo      : String(6)
  sku          : String(50)
  nomeProduto  : String(150)
  precoPraticado: Decimal(10,2)
  qtdVendida   : Integer
  dataCaptura  : DateTime

Desvios
  ID (cuid)
  unidade         : Association to Unidades
  tipo            : Association to TipoDesvio  [code: Preco|Mix|Promocao]
  sku             : String(50)
  nomeProduto     : String(150)
  precoAutorizado : Decimal(10,2)
  precoPraticado  : Decimal(10,2)
  percentualDesvio: Decimal(5,2)
  severidade      : Association to Severidade
  status          : Association to StatusDesvio  [code: Aberto|Notificado|EmCorrecao|Resolvido|Ignorado]
  dataDeteccao    : DateTime
  dataResolucao   : DateTime
  notificacoes    : Composition of many NotificacoesCompliance on notificacoes.desvio = $self

RegrasCompliance
  ID (cuid)
  tipo             : Association to TipoDesvio
  limiarMedia_pct  : Decimal(5,2)  — e.g.: 5.0 (5%)
  limiarAlta_pct   : Decimal(5,2)  — e.g.: 15.0 (15%)
  prazoCorrecao_dias: Integer
  ativa            : Boolean default true

NotificacoesCompliance
  ID (cuid)
  desvio            : Association to Desvios
  unidade           : Association to Unidades
  dataEnvio         : DateTime
  prazoCorrecao     : Date
  status            : Association to StatusNotificacao  [code: Enviada|Lida|AcaoTomada|Vencida]
  comentarioResposta: String(500)
```

### 3.4 Franchisee Portal Module

```
Recomendacoes
  ID (cuid)
  unidade    : Association to Unidades
  tipo       : Association to TipoRecomendacao  [code: Estoque|Precificacao|Operacional|Treinamento|Campanha]
  titulo     : String(150)
  descricao  : String(2000)
  prioridade : Association to Prioridade  [code: Alta|Media|Baixa]
  status     : Association to StatusRecomendacao  [code: Nova|Lida|Aplicada|Descartada]
  dataGeracao: DateTime
  dataValidade: DateTime
```

### 3.5 Onboarding Module

```
ProcessosOnboarding
  ID (cuid)
  unidade              : Association to Unidades
  dataInicio           : Date
  dataPrevisaoAbertura : Date
  status               : Association to StatusOnboarding  [code: EmAndamento|Concluido|Suspenso|Cancelado]
  percentualConclusao  : Decimal(5,2)
  tarefas              : Composition of many TarefasOnboarding on tarefas.processo = $self

EtapasOnboarding
  ID (cuid)
  nome          : String(100)
  descricao     : String(500)
  ordem         : Integer
  obrigatoria   : Boolean default true
  prazoEstimado : Integer  — days

TarefasOnboarding
  ID (cuid)
  processo       : Association to ProcessosOnboarding
  etapa          : Association to EtapasOnboarding
  nome           : String(100)
  status         : Association to StatusTarefa  [code: Pendente|EmAndamento|Concluida|Bloqueada|Vencida]
  responsavel    : String(100)
  dataVencimento : Date
  dataConclusao  : Date
  observacao     : String(500)
  documentos     : Composition of many DocumentosOnboarding on documentos.tarefa = $self
  aprovacoes     : Composition of many AprovacoesOnboarding on aprovacoes.tarefa = $self

DocumentosOnboarding
  ID (cuid)
  tarefa    : Association to TarefasOnboarding
  nome      : String(100)
  tipo      : Association to TipoDocumento  [code: Contrato|Licenca|Certidao|Comprovante|Outro]
  status    : Association to StatusDocumento  [code: Pendente|Enviado|Aprovado|Rejeitado]
  url       : String(500)
  dataEnvio : DateTime
  comentario: String(500)

AprovacoesOnboarding
  ID (cuid)
  tarefa     : Association to TarefasOnboarding
  aprovador  : String(100)
  status     : Association to StatusAprovacao  [code: Pendente|Aprovado|Rejeitado]
  comentario : String(500)
  dataDecisao: DateTime

Contratos_Franquia
  ID (cuid)
  unidade       : Association to Unidades
  dataInicio    : Date
  dataVencimento: Date
  status        : Association to StatusContrato  [code: Ativo|VencendoEm90dias|VencendoEm30dias|Vencido|Renovado]
  valorRoyalties: Decimal(15,2)
```

---

## 4. OData V4 Services

**File:** `srv/service.cds`

### 4.1 FranqueadoraService

- **Path:** `/franqueadora`
- **Role:** `Franqueadora_Gestor`
- **Access:** read and write on all entities
- Exposes: Franqueados, Unidades, Saude_Unidade (readonly), KPI_Unidade (readonly), Alertas, Benchmark_Cluster (readonly), Catalogos, ItensCatalogo, VendaPraticada, Desvios, RegrasCompliance, NotificacoesCompliance, Recomendacoes, ProcessosOnboarding, EtapasOnboarding, TarefasOnboarding, DocumentosOnboarding, AprovacoesOnboarding, Contratos_Franquia + all Code Lists (readonly)

### 4.2 FranqueadoService

- **Path:** `/franqueado`
- **Role:** `Franqueado`
- **Access:** restricted to the franchisee's own unit via `@restrict.where`
- **Required JWT attributes:** `unidade_ID` and `cluster` (configured in IAS)

**Correct restriction pattern (CAP 10):**
```cds
// ✅ CORRECT — @restrict with where (evaluated at query time)
@readonly
@(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
entity MeusKPIs as projection on mf.KPI_Unidade;

// ❌ WRONG — $user.* in select where (fails on deploy in CAP 10)
entity MeusKPIs as select from mf.KPI_Unidade
  where unidade.ID = $user.unidade_ID;
```

FranqueadoService entities:
- `MeusKPIs` — `@restrict where: 'unidade_ID = $user.unidade_ID'`
- `MinhaSaude` — `@restrict where: 'unidade_ID = $user.unidade_ID'`
- `BenchmarkMeuCluster` — `@restrict where: 'cluster_code = $user.cluster'`
- `MeusDesvios` — `@restrict where: 'unidade_ID = $user.unidade_ID'`
- `MinhasNotificacoes` — `@restrict where: 'unidade_ID = $user.unidade_ID'`
- `MinhasRecomendacoes` — `@restrict where: 'unidade_ID = $user.unidade_ID'`
- `MeuOnboarding` — `@restrict where: 'unidade_ID = $user.unidade_ID'`
- `MinhasTarefas` — `@restrict where: 'processo.unidade_ID = $user.unidade_ID'`
- `MeusDocumentos` — `@restrict where: 'tarefa.processo.unidade_ID = $user.unidade_ID'`
- `MeuContrato` — `@restrict where: 'unidade_ID = $user.unidade_ID'`
- `MeusAlertas` — `@restrict where: 'unidade_ID = $user.unidade_ID'`
- Code lists: Severidade, TipoDesvio, TipoRecomendacao, Prioridade, StatusRecomendacao, StatusTarefa

### 4.3 Mock users (development)

Configured in `package.json` directly under `cds.requires.auth` (not under `[development]` — incorrect format in CDS 10):

```json
"cds": {
  "requires": {
    "auth": {
      "kind": "mocked",
      "users": {
        "gestor":  { "password": "gestor",  "roles": ["Franqueadora_Gestor"] },
        "roberto": { "password": "roberto", "roles": ["Franqueado"],
                     "attr": { "unidade_ID": "u147", "cluster": "STD" } }
      }
    }
  }
}
```

> **IMPORTANT:** In CDS 10, the `[development]` block is **not** loaded automatically by `cds watch`. The `auth` configuration must be directly under `cds.requires`, not nested in `[development]`.

---

## 5. Fiori Elements Apps

### File structure

```
app/
├── network/       ← Network Panel
├── compliance/    ← Governance & Compliance
├── franchisee/    ← Franchisee Portal
└── onboarding/    ← Onboarding
```

Each app has:
- `webapp/manifest.json` — ✅ created
- `webapp/i18n/i18n.properties` — ✅ created
- `annotations.cds` — ⚠️ stub — **to implement**

### Critical annotation rule

```
✅ app/<app>/annotations.cds     — compiled by CAP, correct
❌ app/<app>/webapp/annotations.xml — NOT compiled by CAP, avoid
```

### 5.1 Network Panel — ALP (`app/network/`)

**Floorplan:** `sap.fe.templates.AnalyticalListPage`  
**Service:** `FranqueadoraService`  
**Main EntitySet:** `Saude_Unidade`  
**Navigation:** `Saude_Unidade` → `Unidades` (Object Page)

**What to implement in `app/network/annotations.cds`:**

```
Saude_Unidade:
  UI.HeaderInfo:
    TypeName: 'Unidade'
    TypeNamePlural: 'Unidades da Rede'
    Title: unidade/nome
    Description: unidade/cidade + '/' + unidade/estado

  UI.LineItem:
    - unidade/codigo        Label: 'Loja'
    - unidade/nome          Label: 'Nome'
    - unidade/cluster_code  Label: 'Cluster'
    - unidade/regiao_code   Label: 'Região'
    - scoreSaude            Label: 'Score'  Criticality: scoreCriticality
    - compliancePct         Label: 'Compliance %'
    - qtdAlertasAlta        Label: 'Alertas Alta'
    - performancePct        Label: 'Performance %'

  UI.SelectionFields:
    - unidade/cluster_code
    - unidade/regiao_code
    - unidade/status_code

  UI.SelectionVariant #Criticas:
    Text: 'Críticas'
    SelectOptions: scoreSaude le 44

  UI.SelectionVariant #VencendoContrato:
    Text: 'Vencendo Contrato'
    (via Contratos_Franquia — use status VencendoEm30dias)

  UI.SelectionVariant #Destaques:
    Text: 'Destaques'
    SelectOptions: scoreSaude ge 80

  UI.Chart #default:
    ChartType: Donut
    Dimensions: [scoreCriticality]
    Measures: [scoreCount]
    Title: 'Distribuição por Score'

  UI.PresentationVariant #default:
    SortOrder: scoreSaude asc
    Visualizations: [@UI.LineItem, @UI.Chart#default]

  Calculated field scoreCriticality (add in the schema or handler):
    1 (red)    if scoreSaude < 45
    2 (yellow) if scoreSaude >= 45 and < 70
    3 (green)  if scoreSaude >= 70
```

### 5.2 Governance & Compliance — LROP (`app/compliance/`)

**Floorplan:** `sap.fe.templates.ListReport` + `sap.fe.templates.ObjectPage`  
**Service:** `FranqueadoraService`  
**Main EntitySet:** `Desvios`

**What to implement in `app/compliance/annotations.cds`:**

```
Desvios:
  UI.HeaderInfo:
    TypeName: 'Desvio'
    TypeNamePlural: 'Desvios de Compliance'
    Title: nomeProduto
    Description: sku

  UI.LineItem:
    - unidade/nome         Label: 'Unidade'
    - unidade/cidade       Label: 'Cidade'
    - tipo_code            Label: 'Tipo'
    - sku                  Label: 'SKU'
    - nomeProduto          Label: 'Produto'
    - precoAutorizado      Label: 'Preço Autorizado'
    - precoPraticado       Label: 'Preço Praticado'
    - percentualDesvio     Label: 'Desvio %'
    - severidade_code      Label: 'Severidade'  Criticality: severidadeCriticality
    - status_code          Label: 'Status'
    - dataDeteccao         Label: 'Detectado em'

  UI.SelectionFields:
    - tipo_code
    - severidade_code
    - status_code
    - unidade_ID

  UI.SelectionVariant #AltaSeveridade:
    Text: 'Alta Severidade'
    SelectOptions: severidade_code eq 'Alta'

  UI.SelectionVariant #SemResposta:
    Text: 'Sem Resposta'
    SelectOptions: status_code eq 'Notificado'

  Object Page — Facets:
    1. Price comparison (FieldGroup with precoAutorizado, precoPraticado, percentualDesvio)
    2. Unit Information (FieldGroup with unidade/nome, unidade/cidade, unidade/cluster)
    3. Notifications (LineItem of notificacoes)

  severidadeCriticality calculated:
    1 (green)  = 'Baixa'
    2 (yellow) = 'Media'
    1 (red)    = 'Alta'  — use value 1 for red in UI.Criticality
```

> **CDS Criticality note:** For red use `Criticality: 1`, yellow `2`, green `3`. The value `0` is neutral (gray).

### 5.3 Franchisee Portal — OVP (`app/franchisee/`)

**Floorplan:** `sap.fe.templates.OverviewPage`  
**Service:** `FranqueadoService`  
**Cards configured in manifest.json** (already defined)

**What to implement in `app/franchisee/annotations.cds`:**

```
MeusKPIs:
  UI.Chart #KPITrend:
    ChartType: Line
    Dimensions: [periodo]
    Measures: [faturamento]
    Title: 'Meu Faturamento'

  UI.PresentationVariant #ByPeriodo:
    SortOrder: periodo asc
    Visualizations: [@UI.Chart#KPITrend]

  UI.SelectionVariant #LastPeriod:
    Text: 'Último período'

MinhaSaude:
  UI.DataPoint #ScoreSaude:
    Value: scoreSaude
    Title: 'Score de Saúde'
    CriticalityCalculation:
      ImprovementDirection: Maximize
      ToleranceRangeLowValue: 45
      DeviationRangeLowValue: 0

  UI.SelectionVariant #Current:
    (no filters — returns the single record for the unit)

MeusDesvios:
  UI.LineItem #Pendentes:
    - nomeProduto  Label: 'Produto'
    - tipo_code    Label: 'Tipo'
    - percentualDesvio  Label: 'Desvio %'
    - severidade_code   Label: 'Severidade'  Criticality: severidadeCriticality
    - dataDeteccao Label: 'Detectado em'

  UI.SelectionVariant #Abertos:
    SelectOptions: status_code eq 'Aberto' or status_code eq 'Notificado'

MinhasRecomendacoes:
  UI.LineItem #Recomendacoes:
    - titulo      Label: 'Recomendação'
    - tipo_code   Label: 'Tipo'
    - prioridade_code  Label: 'Prioridade'
    - dataGeracao Label: 'Gerada em'

  UI.SelectionVariant #Novas:
    SelectOptions: status_code eq 'Nova'

BenchmarkMeuCluster:
  UI.Chart #BenchmarkComparativo:
    ChartType: Bar
    Dimensions: [periodo]
    Measures: [faturamentoMedio, ticketMedioMedio]
    Title: 'Média do Cluster'

  UI.PresentationVariant #ByPeriodo:
    SortOrder: periodo asc
```

### 5.4 Onboarding — LROP + Draft (`app/onboarding/`)

**Floorplan:** `sap.fe.templates.ListReport` + `sap.fe.templates.ObjectPage`  
**Service:** `FranqueadoraService`  
**Main EntitySet:** `ProcessosOnboarding`  
**Draft:** enable with `@odata.draft.enabled` in the service

**Add to `srv/service.cds`:**
```cds
@odata.draft.enabled
entity ProcessosOnboarding as projection on mf.ProcessosOnboarding;
```

**What to implement in `app/onboarding/annotations.cds`:**

```
ProcessosOnboarding:
  UI.HeaderInfo:
    TypeName: 'Processo de Onboarding'
    TypeNamePlural: 'Processos de Onboarding'
    Title: unidade/nome
    Description: status_code

  UI.LineItem:
    - unidade/nome               Label: 'Unidade'
    - unidade/cidade             Label: 'Cidade'
    - unidade/cluster_code       Label: 'Cluster'
    - dataInicio                 Label: 'Início'
    - dataPrevisaoAbertura       Label: 'Previsão Abertura'
    - percentualConclusao        Label: '% Conclusão'
    - status_code                Label: 'Status'  Criticality: statusCriticality

  UI.SelectionFields:
    - status_code
    - unidade/regiao_code
    - dataPrevisaoAbertura

  Object Page — Facets:
    1. General Data (FieldGroup)
    2. Tasks (LineItem of tarefas)
    3. Documents (LineItem via tarefas/documentos)

TarefasOnboarding:
  UI.LineItem:
    - etapa/nome         Label: 'Etapa'
    - nome               Label: 'Tarefa'
    - responsavel        Label: 'Responsável'
    - dataVencimento     Label: 'Prazo'
    - status_code        Label: 'Status'  Criticality: tarefaCriticality
    - dataConclusao      Label: 'Concluída em'
```

---

## 6. Service Handlers

**File to create:** `srv/service.js`  
**Pattern:** class-based `extends cds.ApplicationService`

### 6.1 Automatic compliance detection

Triggered after INSERT on `VendaPraticada`. For each new record:

```javascript
// Pseudocode of the logic — implement in srv/service.js
async function detectarDesvios(venda) {
  // 1. Look up the item in the active catalog for the SKU
  const itemCatalogo = await SELECT.one(ItensCatalogo)
    .where({ sku: venda.sku, ativo: true });

  if (!itemCatalogo) {
    // SKU not found = Mix deviation
    await INSERT(Desvios, {
      unidade_ID:    venda.unidade_ID,
      tipo_code:     'Mix',
      sku:           venda.sku,
      nomeProduto:   venda.nomeProduto,
      precoAutorizado: null,
      precoPraticado:  venda.precoPraticado,
      percentualDesvio: 0,
      severidade_code: 'Alta',
      status_code:   'Aberto',
      dataDeteccao:  new Date()
    });
  } else if (venda.precoPraticado < itemCatalogo.precoMinimo ||
             venda.precoPraticado > itemCatalogo.precoMaximo) {
    // Price deviation
    const pct = Math.abs(venda.precoPraticado - itemCatalogo.precoSugerido)
              / itemCatalogo.precoSugerido * 100;

    // Look up the compliance rule to calculate severity
    const regra = await SELECT.one(RegrasCompliance)
      .where({ tipo_code: 'Preco', ativa: true });

    const severidade = pct >= (regra?.limiarAlta_pct ?? 15)  ? 'Alta'
                     : pct >= (regra?.limiarMedia_pct ?? 5)  ? 'Media'
                     : 'Baixa';

    await INSERT(Desvios, {
      unidade_ID:      venda.unidade_ID,
      tipo_code:       'Preco',
      sku:             venda.sku,
      nomeProduto:     venda.nomeProduto,
      precoAutorizado: itemCatalogo.precoSugerido,
      precoPraticado:  venda.precoPraticado,
      percentualDesvio: pct,
      severidade_code: severidade,
      status_code:     'Aberto',
      dataDeteccao:    new Date()
    });
  }

  // 2. Recalculate the unit's health score
  await recalcularSaude(venda.unidade_ID);
}
```

### 6.2 Recalculate Health Score

```javascript
async function recalcularSaude(unidadeId) {
  // Get the latest KPI for the unit
  const kpi = await SELECT.one(KPI_Unidade)
    .where({ unidade_ID: unidadeId })
    .orderBy('periodo desc');

  // Get the benchmark for the unit's cluster
  const unidade = await SELECT.one(Unidades).where({ ID: unidadeId });
  const benchmark = await SELECT.one(Benchmark_Cluster)
    .where({ cluster_code: unidade.cluster_code })
    .orderBy('periodo desc');

  // Calculate performancePct
  const performancePct = benchmark?.faturamentoMedio > 0
    ? Math.min((kpi?.faturamento / benchmark.faturamentoMedio) * 100, 100)
    : 50;

  // Get the contract
  const contrato = await SELECT.one(Contratos_Franquia)
    .where({ unidade_ID: unidadeId });
  const scoreContrato =
    contrato?.status_code === 'Ativo'              ? 100 :
    contrato?.status_code === 'VencendoEm90dias'   ? 60  :
    contrato?.status_code === 'VencendoEm30dias'   ? 30  : 0;

  // Count open deviations for compliancePct
  const desviosAbertos = await SELECT.from(Desvios)
    .where({ unidade_ID: unidadeId, status_code: 'Aberto' });
  const compliancePct = Math.max(0, 100 - (desviosAbertos.length * 12));

  const scoreSaude = (performancePct * 0.40) + (compliancePct * 0.40) + (scoreContrato * 0.20);

  const qtdAlertasAlta  = desviosAbertos.filter(d => d.severidade_code === 'Alta').length;
  const qtdAlertasMedia = desviosAbertos.filter(d => d.severidade_code === 'Media').length;

  await UPSERT(Saude_Unidade).entries({
    unidade_ID:      unidadeId,
    scoreSaude:      Math.round(scoreSaude * 100) / 100,
    compliancePct,
    performancePct,
    qtdAlertasAlta,
    qtdAlertasMedia,
    dataAtualizacao: new Date()
  });
}
```

### 6.3 service.js structure

```javascript
const cds = require('@sap/cds');

module.exports = class FranqueadoraService extends cds.ApplicationService {
  async init() {
    const { VendaPraticada, KPI_Unidade } = this.entities;

    // Compliance — automatic detection
    this.after('CREATE', VendaPraticada, async (data) => {
      await this.detectarDesvios(data);
    });

    // Score — recalculate when KPI is updated
    this.after('CREATE', KPI_Unidade, async (data) => {
      await this.recalcularSaude(data.unidade_ID);
    });

    return super.init();
  }

  async detectarDesvios(venda) { /* implement per section 6.1 */ }
  async recalcularSaude(unidadeId) { /* implement per section 6.2 */ }
};
```

---

## 7. Integration with AI Core + GenAI Hub

**Objective:** Generate personalized recommendations for each unit based on KPIs, deviations, and benchmark.

**File to create:** `srv/ai/recommendations-job.js`

### Integration pattern

```javascript
// 1. Connect to AI Core (GenAI Hub) via CDS binding
const aiCore = await cds.connect.to('aicore');

// 2. Build the payload for each unit
const prompt = `
Você é um consultor de franquias. Com base nos dados abaixo, gere 3 recomendações 
práticas e priorizadas para o franqueado melhorar sua performance.

Unidade: ${unidade.nome} | Cluster: ${unidade.cluster_code}
Faturamento jun/2026: R$ ${kpi.faturamento} (média do cluster: R$ ${benchmark.faturamentoMedio})
NPS: ${kpi.nps} (média: ${benchmark.npsMedio})
Desvios de compliance: ${desvios.map(d => d.nomeProduto + ' ' + d.tipo_code).join(', ')}

Retorne um array JSON: [{ tipo, titulo, descricao, prioridade }]
tipos: Estoque | Precificacao | Operacional | Treinamento | Campanha
prioridades: Alta | Media | Baixa
`;

// 3. Call the model
const response = await aiCore.send({
  messages: [{ role: 'user', content: prompt }],
  model: 'gpt-4o',
  max_tokens: 800
});

// 4. Persist the recommendations
const recomendacoes = JSON.parse(response.choices[0].message.content);
await INSERT(Recomendacoes).entries(
  recomendacoes.map(r => ({
    unidade_ID:  unidade.ID,
    tipo_code:   r.tipo,
    titulo:      r.titulo,
    descricao:   r.descricao,
    prioridade_code: r.prioridade,
    status_code: 'Nova',
    dataGeracao: new Date(),
    dataValidade: /* +30 days */
  }))
);
```

### Configuration in `.cdsrc.json` (production)

```json
{
  "requires": {
    "aicore": {
      "kind": "rest",
      "credentials": {
        "url": "<AI_CORE_URL>",
        "clientid": "<CLIENT_ID>",
        "clientsecret": "<CLIENT_SECRET>",
        "tokenServiceURL": "<TOKEN_URL>"
      }
    }
  }
}
```

---

## 8. Seed Data — reference IDs

Unit IDs follow the pattern `u<codigo>`. Store 147 = `u147`.

### Highlighted units in the demo scenario

| ID | Code | Name | Score | Cluster | Demo status |
|---|---|---|---|---|---|
| `u023` | 023 | Paulista Store | 88 | FLG | Green — highlight |
| `u045` | 045 | Ipanema Store | 82 | FLG | Green |
| `u147` | **147** | **Porto Alegre Store** | **32** | STD | **🔴 Critical — DEMO** |
| `u289` | 289 | Natal Store | 38 | EXP | Red |
| `u267` | 267 | Goiânia Store | 42 | EXP | Red |

### Code list values (quick reference)

```
Cluster:  FLG = Flagship | STD = Standard | EXP = Express
Regiao:   N | NE | CO | SE | S
StatusKPI: Critico | Atencao | Normal | Destaque
TipoDesvio: Preco | Mix | Promocao
Severidade: Alta | Media | Baixa
StatusDesvio: Aberto | Notificado | EmCorrecao | Resolvido | Ignorado
TipoRecomendacao: Estoque | Precificacao | Operacional | Treinamento | Campanha
Prioridade: Alta | Media | Baixa
StatusRecomendacao: Nova | Lida | Aplicada | Descartada
```

---

## 9. Work Zone — Tile Configuration

All `manifest.json` files already have `sap.cloud.service: "myfranchise"` and `crossNavigation.inbounds` configured:

| App | Semantic Object | Action | Icon |
|---|---|---|---|
| network | `NetworkPanel` | `display` | `org-chart` |
| compliance | `Compliance` | `manage` | `alert` |
| franchisee | `FranchiseePortal` | `display` | `home` |
| onboarding | `Onboarding` | `manage` | `stage` |

---

## 10. Tasks — What remains to implement

### Week 2 (08/05–08/11) — Top priority

- [ ] `app/network/annotations.cds` — complete ALP (chart, columns, selection variants, criticality)
- [ ] `app/compliance/annotations.cds` — LROP Desvios (list report + object page with notifications)
- [ ] `srv/service.js` — compliance detection handler (section 6.1 + 6.2)
- [ ] Add the calculated field `scoreCriticality` to `Saude_Unidade` in the schema or handler
- [ ] Enable `@odata.draft.enabled` on `ProcessosOnboarding` in the service

### Week 3 (08/12–08/18)

- [ ] `app/franchisee/annotations.cds` — OVP with all 5 cards
- [ ] `app/onboarding/annotations.cds` — LROP + Object Page with tasks
- [ ] `srv/ai/recommendations-job.js` — AI Core + GenAI Hub integration
- [ ] Test FranqueadoService data isolation (user `roberto`)

### Week 4 (08/19–08/25) — polish and deploy

- [ ] Build Work Zone: manual tile setup after deploy
- [ ] MTA deploy to BTP Cloud Foundry
- [ ] `mta.yaml` with HANA Cloud, XSUAA, AI Core services
- [ ] Timed rehearsals — strict 15 min
- [ ] Plan B in case the demo fails

---

## 11. Coding Rules

1. **Always** use `app/<app>/annotations.cds` for UI annotations — never `webapp/annotations.xml`
2. **Never** use `$user.*` in static CDS 10 view definitions — use `@restrict.where`
3. **Always** call `return super.init()` at the end of the service handler's `init()`
4. **Always** use `@readonly` on entities that do not require writes in FranqueadoService
5. **Never** hardcode compliance thresholds — always read them from `RegrasCompliance`
6. To insert data in handlers: use `INSERT.into(Entity).entries({...})` (CAP 10)
7. For upsert: use `UPSERT(Entity).entries({...})` (CAP 10)
8. The `ID` field in `cuid` entities is auto-generated — do not pass it in the INSERT
9. To navigate from `Unidades` to children: use `SELECT.from(KPI_Unidade).where({ unidade_ID: id })` (no back-association)
10. **Always test** with `cds watch` before committing

---

## 12. How to Run

```bash
# Install dependencies
npm install

# Run locally
cds watch
# Access: http://localhost:4004
# gestor / gestor     → /franqueadora
# roberto / roberto   → /franqueado  (Store 147, cluster STD)

# Validate schema
node test_schema.js
```

---

## 13. Important Files

| File | Status | Description |
|---|---|---|
| `db/schema.cds` | ✅ Complete | Unified data model |
| `srv/service.cds` | ✅ Complete | Definition of the two OData services |
| `srv/service.js` | ❌ To create | Compliance and score handlers |
| `app/network/annotations.cds` | ⚠️ Stub | ALP Network Panel |
| `app/compliance/annotations.cds` | ⚠️ Stub | LROP Compliance |
| `app/franchisee/annotations.cds` | ⚠️ Stub | OVP Franchisee Portal |
| `app/onboarding/annotations.cds` | ⚠️ Stub | LROP Onboarding |
| `app/*/webapp/manifest.json` | ✅ Complete | Routing + Work Zone config |
| `db/data/*.csv` | ✅ 35 files | Complete seed data |
| `package.json` | ✅ Complete | Mock users + SQLite config |
| `mta.yaml` | ❌ To create | Deploy to BTP CF (Week 4) |
