# RunMyFranchise — Especificação Técnica
> Versão 1.0 · Julho 2026  
> Use este documento como contexto primário para implementação com Claude Code.

---

## 1. Contexto do Projeto

### O que é

Plataforma SAP BTP para gestão de redes de franquias. Centraliza a visão da rede, detecta automaticamente desvios de compliance, fornece dashboard ao franqueado e padroniza o onboarding de novas unidades.

### Competição

- **Evento:** Dragons' Den: Learn to Win Edition 2026 — SAP Solution Advisory
- **Apresentação:** 15 min demo ao vivo + 5 min Q&A. Sem screenshots.
- **Data:** 26 de agosto de 2026
- **Critério de maior peso:** Live Demo Quality (20%)

### Persona da demo

**Alexandre Mendes** — Diretor de Operações e Expansão, rede de 280 lojas fashion/lifestyle. Quer dobrar a rede em 3 anos. Problema: cada franqueado é uma ilha, KPIs chegam com atraso, compliance é manual, onboarding leva meses.

### Cenário de demo — Loja 147

A Loja 147 (Porto Alegre, cluster Standard) é a unidade usada nos blocos de demo ao vivo:
- Score de Saúde: **32/100** (crítico — vermelho no ALP)
- 4 desvios detectados: SKU-004 Tênis Casual (-14,3% Alta), SKU-011 Boné Aba Curva (-24,1% Alta), SKU-003 Vestido Midi (-8,8% Média), SKU-999 produto não autorizado (Mix Alta)
- Franqueado: Roberto Mendes (`unidade_ID: 'u147'`, `cluster: 'STD'`)
- KPIs jan–jun/2026 em queda: R$ 189k → R$ 162k
- 3 recomendações AI pré-geradas
- 3 notificações de compliance enviadas

---

## 2. Stack e Decisões de Arquitetura

### Decisões tomadas — não alterar

| Decisão | Escolha |
|---|---|
| Runtime BTP | Cloud Foundry |
| Backend | SAP CAP (Node.js), OData V4, `@sap/cds ^10` |
| Banco de dados | SAP HANA Cloud (produção) / SQLite em memória (dev) |
| Frontend Franqueadora | SAP Fiori Elements via SAP Build Work Zone |
| Frontend Franqueado | SAP Fiori Elements via SAP Build Work Zone |
| Mobile | Responsivo via browser (PWA) — sem app nativo |
| Theming | SAP UI Theme Designer (pós-definição da identidade visual) |
| Analytics MVP | HANA + Fiori (sem SAC) |
| Analytics Fase 2 | SAP Analytics Cloud |
| SAP Datasphere | Fora do MVP — citado na arquitetura como evolução |

### Versões

```json
{
  "@sap/cds": "^10",
  "@cap-js/sqlite": "^2",
  "express": "^4",
  "node": ">=20"
}
```

> **Nota:** `@cap-js/sqlite@1.x` é incompatível com `@sap/cds@10`. Usar `^2.1.3` ou superior (usa `better-sqlite3`, compatível com Node 22). `@cap-js/sqlite@3` requer `node:sqlite` nativo disponível apenas no Node 22.5+ com flag `--experimental-sqlite`.

---

## 3. Modelo de Dados Completo

**Arquivo:** `db/schema.cds`  
**Namespace:** `myfranchise`

### 3.1 Entidades Core

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
  codigo      : String(20)   — ex: '147'
  nome        : String(100)  — ex: 'Loja Porto Alegre'
  franqueado  : Association to Franqueados
  endereco    : String(255)
  cidade      : String(100)
  estado      : String(2)
  regiao      : Association to Regiao  [code: N|NE|CO|SE|S]
  cluster     : Association to Cluster  [code: FLG|STD|EXP]
  dataAbertura: Date
  status      : Association to StatusUnidade  [code: EmOnboarding|Ativa|Inativa|Suspensa]
  — SEM back-associations (removidas para evitar resolveView bug no CAP 10)
```

> **IMPORTANTE:** `Unidades` não tem back-associations para `Saude_Unidade`, `KPI_Unidade`, `Alertas`, `Desvios` ou `ProcessosOnboarding`. Navegação feita via `$expand` ou query direta com filtro `unidade_ID`.

### 3.2 Módulo Network — Painel da Rede

```
KPI_Unidade
  ID (cuid)
  unidade      : Association to Unidades  — FK: unidade_ID
  periodo      : String(6)   — formato YYYYMM ex: '202606'
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
  scoreSaude     : Decimal(5,2)   — 0 a 100
  compliancePct  : Decimal(5,2)   — % conformidade
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

**Fórmula do Score de Saúde (a implementar no service handler):**
```
scoreSaude = (performancePct × 0.40) + (compliancePct × 0.40) + (scoreContrato × 0.20)

scoreContrato:
  100  se status = 'Ativo'
  60   se status = 'VencendoEm90dias'
  30   se status = 'VencendoEm30dias'
  0    se status = 'Vencido'

performancePct = (faturamento_unidade / faturamentoMedio_cluster) × 100  (cap 100)
```

### 3.3 Módulo Compliance — Governança

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
  limiarMedia_pct  : Decimal(5,2)  — ex: 5.0 (5%)
  limiarAlta_pct   : Decimal(5,2)  — ex: 15.0 (15%)
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

### 3.4 Módulo Portal do Franqueado

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

### 3.5 Módulo Onboarding

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
  prazoEstimado : Integer  — dias

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

## 4. Serviços OData V4

**Arquivo:** `srv/service.cds`

### 4.1 FranqueadoraService

- **Path:** `/franqueadora`
- **Role:** `Franqueadora_Gestor`
- **Acesso:** leitura e escrita em todas as entidades
- Expõe: Franqueados, Unidades, Saude_Unidade (readonly), KPI_Unidade (readonly), Alertas, Benchmark_Cluster (readonly), Catalogos, ItensCatalogo, VendaPraticada, Desvios, RegrasCompliance, NotificacoesCompliance, Recomendacoes, ProcessosOnboarding, EtapasOnboarding, TarefasOnboarding, DocumentosOnboarding, AprovacoesOnboarding, Contratos_Franquia + todos os Code Lists (readonly)

### 4.2 FranqueadoService

- **Path:** `/franqueado`
- **Role:** `Franqueado`
- **Acesso:** restrito à própria unidade via `@restrict.where`
- **Atributos JWT necessários:** `unidade_ID` e `cluster` (configurados no IAS)

**Padrão correto de restrição (CAP 10):**
```cds
// ✅ CORRETO — @restrict com where (avaliado em query time)
@readonly
@(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
entity MeusKPIs as projection on mf.KPI_Unidade;

// ❌ ERRADO — $user.* em select where (falha no deploy CAP 10)
entity MeusKPIs as select from mf.KPI_Unidade
  where unidade.ID = $user.unidade_ID;
```

Entidades do FranqueadoService:
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

### 4.3 Usuários mock (desenvolvimento)

Configurado em `package.json` diretamente em `cds.requires.auth` (não em `[development]` — formato incorreto no CDS 10):

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

> **IMPORTANTE:** No CDS 10, o bloco `[development]` **não** é carregado automaticamente pelo `cds watch`. A configuração de `auth` deve estar diretamente em `cds.requires`, não aninhada em `[development]`.

---

## 5. Apps Fiori Elements

### Estrutura de arquivos

```
app/
├── network/       ← Painel da Rede
├── compliance/    ← Governança & Compliance
├── franchisee/    ← Portal do Franqueado
└── onboarding/    ← Onboarding
```

Cada app tem:
- `webapp/manifest.json` — ✅ criado
- `webapp/i18n/i18n.properties` — ✅ criado
- `annotations.cds` — ⚠️ stub — **implementar**

### Regra crítica de anotações

```
✅ app/<app>/annotations.cds     — compilado pelo CAP, correto
❌ app/<app>/webapp/annotations.xml — NÃO compilado pelo CAP, evitar
```

### 5.1 Painel da Rede — ALP (`app/network/`)

**Floorplan:** `sap.fe.templates.AnalyticalListPage`  
**Serviço:** `FranqueadoraService`  
**EntitySet principal:** `Saude_Unidade`  
**Navegação:** `Saude_Unidade` → `Unidades` (Object Page)

**O que implementar em `app/network/annotations.cds`:**

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
    (via Contratos_Franquia — usar status VencendoEm30dias)

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

  Campo calculado scoreCriticality (adicionar no schema ou handler):
    1 (vermelho) se scoreSaude < 45
    2 (amarelo)  se scoreSaude >= 45 e < 70
    3 (verde)    se scoreSaude >= 70
```

### 5.2 Governança & Compliance — LROP (`app/compliance/`)

**Floorplan:** `sap.fe.templates.ListReport` + `sap.fe.templates.ObjectPage`  
**Serviço:** `FranqueadoraService`  
**EntitySet principal:** `Desvios`

**O que implementar em `app/compliance/annotations.cds`:**

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
    1. Comparativo de preços (FieldGroup com precoAutorizado, precoPraticado, percentualDesvio)
    2. Informações da Unidade (FieldGroup com unidade/nome, unidade/cidade, unidade/cluster)
    3. Notificações (LineItem de notificacoes)

  severidadeCriticality calculado:
    1 (verde)    = 'Baixa'
    2 (amarelo)  = 'Media'
    1 (vermelho) = 'Alta'  — usar valor 1 para vermelho em UI.Criticality
```

> **Nota de CDS Criticality:** Para vermelho use `Criticality: 1`, amarelo `2`, verde `3`. O valor `0` é neutro (cinza).

### 5.3 Portal do Franqueado — OVP (`app/franchisee/`)

**Floorplan:** `sap.fe.templates.OverviewPage`  
**Serviço:** `FranqueadoService`  
**Cards configurados no manifest.json** (já definidos)

**O que implementar em `app/franchisee/annotations.cds`:**

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
    (sem filtros — retorna o único registro da unidade)

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
**Serviço:** `FranqueadoraService`  
**EntitySet principal:** `ProcessosOnboarding`  
**Draft:** habilitar com `@odata.draft.enabled` no service

**Adicionar ao `srv/service.cds`:**
```cds
@odata.draft.enabled
entity ProcessosOnboarding as projection on mf.ProcessosOnboarding;
```

**O que implementar em `app/onboarding/annotations.cds`:**

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
    1. Dados Gerais (FieldGroup)
    2. Tarefas (LineItem de tarefas)
    3. Documentos (LineItem via tarefas/documentos)

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

**Arquivo a criar:** `srv/service.js`  
**Padrão:** class-based `extends cds.ApplicationService`

### 6.1 Detecção automática de compliance

Disparado após INSERT em `VendaPraticada`. Para cada registro novo:

```javascript
// Pseudocódigo da lógica — implementar em srv/service.js
async function detectarDesvios(venda) {
  // 1. Busca item no catálogo ativo para o SKU
  const itemCatalogo = await SELECT.one(ItensCatalogo)
    .where({ sku: venda.sku, ativo: true });

  if (!itemCatalogo) {
    // SKU não encontrado = desvio de Mix
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
    // Desvio de preço
    const pct = Math.abs(venda.precoPraticado - itemCatalogo.precoSugerido)
              / itemCatalogo.precoSugerido * 100;

    // Busca regra de compliance para calcular severidade
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

  // 2. Recalcula score de saúde da unidade
  await recalcularSaude(venda.unidade_ID);
}
```

### 6.2 Recalcular Score de Saúde

```javascript
async function recalcularSaude(unidadeId) {
  // Busca último KPI da unidade
  const kpi = await SELECT.one(KPI_Unidade)
    .where({ unidade_ID: unidadeId })
    .orderBy('periodo desc');

  // Busca benchmark do cluster da unidade
  const unidade = await SELECT.one(Unidades).where({ ID: unidadeId });
  const benchmark = await SELECT.one(Benchmark_Cluster)
    .where({ cluster_code: unidade.cluster_code })
    .orderBy('periodo desc');

  // Calcula performancePct
  const performancePct = benchmark?.faturamentoMedio > 0
    ? Math.min((kpi?.faturamento / benchmark.faturamentoMedio) * 100, 100)
    : 50;

  // Busca contrato
  const contrato = await SELECT.one(Contratos_Franquia)
    .where({ unidade_ID: unidadeId });
  const scoreContrato =
    contrato?.status_code === 'Ativo'              ? 100 :
    contrato?.status_code === 'VencendoEm90dias'   ? 60  :
    contrato?.status_code === 'VencendoEm30dias'   ? 30  : 0;

  // Conta desvios abertos para compliancePct
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

### 6.3 Estrutura do service.js

```javascript
const cds = require('@sap/cds');

module.exports = class FranqueadoraService extends cds.ApplicationService {
  async init() {
    const { VendaPraticada, KPI_Unidade } = this.entities;

    // Compliance — detecção automática
    this.after('CREATE', VendaPraticada, async (data) => {
      await this.detectarDesvios(data);
    });

    // Score — recalcular quando KPI é atualizado
    this.after('CREATE', KPI_Unidade, async (data) => {
      await this.recalcularSaude(data.unidade_ID);
    });

    return super.init();
  }

  async detectarDesvios(venda) { /* implementar conforme seção 6.1 */ }
  async recalcularSaude(unidadeId) { /* implementar conforme seção 6.2 */ }
};
```

---

## 7. Integração com AI Core + GenAI Hub

**Objetivo:** Gerar recomendações personalizadas para cada unidade com base em KPIs, desvios e benchmark.

**Arquivo a criar:** `srv/ai/recommendations-job.js`

### Padrão de integração

```javascript
// 1. Conectar ao AI Core (GenAI Hub) via CDS binding
const aiCore = await cds.connect.to('aicore');

// 2. Montar o payload para cada unidade
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

// 3. Chamar o modelo
const response = await aiCore.send({
  messages: [{ role: 'user', content: prompt }],
  model: 'gpt-4o',
  max_tokens: 800
});

// 4. Persistir as recomendações
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
    dataValidade: /* +30 dias */
  }))
);
```

### Configuração no `.cdsrc.json` (produção)

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

## 8. Seed Data — IDs de referência

Os IDs das unidades usam o padrão `u<codigo>`. Loja 147 = `u147`.

### Unidades de destaque no cenário de demo

| ID | Código | Nome | Score | Cluster | Status demo |
|---|---|---|---|---|---|
| `u023` | 023 | Loja Paulista | 88 | FLG | Verde — destaque |
| `u045` | 045 | Loja Ipanema | 82 | FLG | Verde |
| `u147` | **147** | **Loja Porto Alegre** | **32** | STD | **🔴 Crítico — DEMO** |
| `u289` | 289 | Loja Natal | 38 | EXP | Vermelho |
| `u267` | 267 | Loja Goiânia | 42 | EXP | Vermelho |

### Code list values (referência rápida)

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

## 9. Work Zone — Configuração de Tiles

Todos os `manifest.json` já têm `sap.cloud.service: "myfranchise"` e `crossNavigation.inbounds` configurados:

| App | Semantic Object | Action | Ícone |
|---|---|---|---|
| network | `NetworkPanel` | `display` | `org-chart` |
| compliance | `Compliance` | `manage` | `alert` |
| franchisee | `FranchiseePortal` | `display` | `home` |
| onboarding | `Onboarding` | `manage` | `stage` |

---

## 10. Tasks — O que falta implementar

### Semana 2 (05–11/08) — Prioridade máxima

- [ ] `app/network/annotations.cds` — ALP completo (chart, columns, selection variants, criticality)
- [ ] `app/compliance/annotations.cds` — LROP Desvios (list report + object page com notificações)
- [ ] `srv/service.js` — handler de detecção de compliance (seção 6.1 + 6.2)
- [ ] Adicionar campo calculado `scoreCriticality` em `Saude_Unidade` no schema ou handler
- [ ] Habilitar `@odata.draft.enabled` em `ProcessosOnboarding` no service

### Semana 3 (12–18/08)

- [ ] `app/franchisee/annotations.cds` — OVP com todos os 5 cards
- [ ] `app/onboarding/annotations.cds` — LROP + Object Page com tarefas
- [ ] `srv/ai/recommendations-job.js` — integração AI Core + GenAI Hub
- [ ] Testar isolamento de dados do FranqueadoService (usuário `roberto`)

### Semana 4 (19–25/08) — polish e deploy

- [ ] Build Work Zone: setup manual dos tiles após deploy
- [ ] Deploy MTA para BTP Cloud Foundry
- [ ] `mta.yaml` com serviços HANA Cloud, XSUAA, AI Core
- [ ] Ensaios com cronômetro — 15 min estrito
- [ ] Plano B para se a demo cair

---

## 11. Regras de Codificação

1. **Sempre** usar `app/<app>/annotations.cds` para UI annotations — nunca `webapp/annotations.xml`
2. **Nunca** usar `$user.*` em definições estáticas de view CDS 10 — usar `@restrict.where`
3. **Sempre** chamar `return super.init()` no final do `init()` do service handler
4. **Sempre** `@readonly` em entidades que não precisam de escrita no FranqueadoService
5. **Nunca** hardcodar limiares de compliance — sempre ler de `RegrasCompliance`
6. Para inserir dados em handlers: usar `INSERT.into(Entity).entries({...})` (CAP 10)
7. Para upsert: usar `UPSERT(Entity).entries({...})` (CAP 10)
8. O campo `ID` em entidades `cuid` é auto-gerado — não passar no INSERT
9. Para navegar de `Unidades` para filhos: usar `SELECT.from(KPI_Unidade).where({ unidade_ID: id })` (sem back-association)
10. **Testar sempre** com `cds watch` antes de commitar

---

## 12. Como Executar

```bash
# Instalar dependências
npm install

# Rodar localmente
cds watch
# Acesse: http://localhost:4004
# gestor / gestor     → /franqueadora
# roberto / roberto   → /franqueado  (Loja 147, cluster STD)

# Validar schema
node test_schema.js
```

---

## 13. Arquivos Importantes

| Arquivo | Status | Descrição |
|---|---|---|
| `db/schema.cds` | ✅ Completo | Modelo de dados unificado |
| `srv/service.cds` | ✅ Completo | Definição dos dois serviços OData |
| `srv/service.js` | ❌ Falta criar | Handlers de compliance e score |
| `app/network/annotations.cds` | ⚠️ Stub | ALP Painel da Rede |
| `app/compliance/annotations.cds` | ⚠️ Stub | LROP Compliance |
| `app/franchisee/annotations.cds` | ⚠️ Stub | OVP Portal Franqueado |
| `app/onboarding/annotations.cds` | ⚠️ Stub | LROP Onboarding |
| `app/*/webapp/manifest.json` | ✅ Completo | Routing + Work Zone config |
| `db/data/*.csv` | ✅ 35 arquivos | Seed data completo |
| `package.json` | ✅ Completo | Mock users + SQLite config |
| `mta.yaml` | ❌ Falta criar | Deploy para BTP CF (Semana 4) |
