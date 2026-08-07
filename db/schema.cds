namespace myfranchise;

using { cuid, managed, sap.common.CodeList } from '@sap/cds/common';

// ═══════════════════════════════════════════════════════════
// CODE LISTS
// ═══════════════════════════════════════════════════════════

entity StatusFranqueado   : CodeList { key code : String(20); }
entity StatusUnidade      : CodeList { key code : String(20); }
entity Regiao             : CodeList { key code : String(20); }
entity Cluster            : CodeList { key code : String(20); }
entity StatusKPI          : CodeList { key code : String(20); }
entity TipoAlerta         : CodeList { key code : String(20); }
entity Severidade         : CodeList { key code : String(20); }
entity StatusAlerta       : CodeList { key code : String(20); }
entity StatusCatalogo     : CodeList { key code : String(20); }
entity TipoDesvio         : CodeList { key code : String(20); }
entity StatusDesvio       : CodeList { key code : String(20); }
entity StatusNotificacao  : CodeList { key code : String(20); }
entity TipoRecomendacao   : CodeList { key code : String(20); }
entity Prioridade         : CodeList { key code : String(20); }
entity StatusRecomendacao : CodeList { key code : String(20); }
entity StatusOnboarding   : CodeList { key code : String(20); }
entity StatusTarefa       : CodeList { key code : String(20); }
entity TipoDocumento      : CodeList { key code : String(20); }
entity StatusDocumento    : CodeList { key code : String(20); }
entity StatusAprovacao    : CodeList { key code : String(20); }
entity StatusContrato     : CodeList { key code : String(20); }

// Estoque / Reposição
entity StatusEstoque      : CodeList { key code : String(20); }  // OK, ATENCAO, RUPTURA
entity StatusPedidoRep    : CodeList { key code : String(20); }  // PENDENTE, APROVADO, RECUSADO, ENVIADO, RECEBIDO
entity OrigemPedido       : CodeList { key code : String(20); }  // AGENTE, MANUAL


// ═══════════════════════════════════════════════════════════
// CORE — Franqueados e Unidades (entidades raiz)
// ═══════════════════════════════════════════════════════════

entity Franqueados : cuid, managed {
  razaoSocial : String(100) @title : '{i18n>Franqueados_razaoSocial}';
  cnpj        : String(18)  @title : '{i18n>Franqueados_cnpj}';
  responsavel : String(100) @title : '{i18n>Franqueados_responsavel}';
  email       : String(255) @title : '{i18n>Franqueados_email}';
  telefone    : String(20)  @title : '{i18n>Franqueados_telefone}';
  status      : Association to StatusFranqueado @title : '{i18n>Franqueados_status}';
  unidades    : Composition of many Unidades on unidades.franqueado = $self;
}

entity Unidades : cuid, managed {
  codigo       : String(20)  @title : '{i18n>Unidades_codigo}';
  nome         : String(100) @title : '{i18n>Unidades_nome}';
  franqueado   : Association to Franqueados @title : '{i18n>Franqueados}';
  endereco     : String(255) @title : '{i18n>Unidades_endereco}';
  cidade       : String(100) @title : '{i18n>Unidades_cidade}';
  estado       : String(2)   @title : '{i18n>Unidades_estado}';
  regiao       : Association to Regiao @title : '{i18n>Unidades_regiao}';
  cluster      : Association to Cluster @title : '{i18n>Unidades_cluster}';
  dataAbertura : Date        @title : '{i18n>Unidades_dataAbertura}';
  status       : Association to StatusUnidade @title : '{i18n>Unidades_status}';
  // Geolocalização para mapa e D5
  lat          : Decimal(9,6)  @title : 'Latitude';
  lon          : Decimal(9,6)  @title : 'Longitude';
  // Status operacional para D6
  emReforma    : Boolean default false @title : 'In Renovation';
  // Tipo de loja — para drill-down no slide D2
  tipoLoja     : String(20)    @title : 'Store Type';  // Flagship, Tier1, Tier2, Online
  // Navegação para entidades filhas via OData $expand — sem back-associations
  // para evitar problemas de resolveView no CAP 10 durante o deploy.
  // Use: /Unidades('u147')?$expand=saude,kpis,alertas,desvios
}


// ═══════════════════════════════════════════════════════════
// NETWORK — KPIs, Saúde, Alertas, Benchmark
// ═══════════════════════════════════════════════════════════

/**
 * KPIs agregados da rede inteira por trimestre.
 * Alimenta o Executive Home (D1) — faturamento, clientes, NPS, margem.
 */
entity KPI_Rede : cuid, managed {
  periodo              : String(6)     @title : 'Period';
  periodoLabel         : String(10)    @title : 'Period Label';
  totalRevenue         : Decimal(15,2) @title : 'Total Revenue';
  netNewRevenue        : Decimal(15,2) @title : 'Net-New Revenue';
  retentionRevenue     : Decimal(15,2) @title : 'Retention Revenue';
  totalCustomers       : Integer       @title : 'Total Customers';
  qoqGrowth            : Decimal(5,2)  @title : 'QoQ Growth %';
  yoyGrowth            : Decimal(5,2)  @title : 'YoY Growth %';
  avgNPS               : Decimal(4,1)  @title : 'Avg NPS';
  avgMargemBruta       : Decimal(5,2)  @title : 'Avg Gross Margin %';
  totalLojas           : Integer       @title : 'Active Stores';
  lojasNovas           : Integer       @title : 'New Stores';
  lojasEmReforma       : Integer       @title : 'Stores in Renovation';
  // Revenue breakdown by category — for D1 bar chart
  revBeauty            : Decimal(15,2) @title : 'Beauty & Wellness Revenue';
  revFashion           : Decimal(15,2) @title : 'Fashion & Apparel Revenue';
  revAccessories       : Decimal(15,2) @title : 'Accessories & Jewelry Revenue';
  revOther             : Decimal(15,2) @title : 'Other Revenue';
  newCustomersPct      : Decimal(5,2)  @title : 'New Customers %';
  returningCustomersPct: Decimal(5,2)  @title : 'Returning Customers %';
}

/**
 * Atividades/destaques do dia — para o card "Today's Highlights" (D1).
 */
entity Atividades_Rede : cuid, managed {
  titulo      : String(200) @title : 'Title';
  descricao   : String(500) @title : 'Description';
  tipo        : String(50)  @title : 'Type';       // REUNIAO, ENTREGA, ALERTA
  horario     : String(10)  @title : 'Time';
  status      : String(20)  @title : 'Status';     // PENDENTE, APROVADO, ABERTO
  data        : Date        @title : 'Date';
}


entity KPI_Unidade : cuid, managed {
  unidade        : Association to Unidades;
  periodo        : String(6)      @title : '{i18n>KPI_Unidade_periodo}';
  faturamento    : Decimal(15,2)  @title : '{i18n>KPI_Unidade_faturamento}';
  ticketMedio    : Decimal(10,2)  @title : '{i18n>KPI_Unidade_ticketMedio}';
  qtdTransacoes  : Integer        @title : '{i18n>KPI_Unidade_qtdTransacoes}';
  crescimentoMoM : Decimal(5,2)   @title : '{i18n>KPI_Unidade_crescimentoMoM}';
  crescimentoYoY : Decimal(5,2)   @title : '{i18n>KPI_Unidade_crescimentoYoY}';
  nps            : Decimal(4,1)   @title : '{i18n>KPI_Unidade_nps}';
  statusKPI      : Association to StatusKPI @title : '{i18n>KPI_Unidade_statusKPI}';
  // Financeiro por loja — para D3 (drill-down) e D6 (KPIs financeiros)
  margemBruta    : Decimal(5,2)   @title : '{i18n>KPI_Unidade_margemBruta}';      // % margem bruta
  cmv            : Decimal(5,2)   @title : '{i18n>KPI_Unidade_cmv}';              // custo mercadoria vendida %
  royalties      : Decimal(15,2)  @title : '{i18n>KPI_Unidade_royalties}';        // valor R$ pago
  inadimplencia  : Decimal(5,2)   @title : '{i18n>KPI_Unidade_inadimplencia}';    // % receita em atraso
  fluxoClientes        : Integer        @title : 'Customer Entrances';
  conversao            : Decimal(5,2)   @title : 'Conversion Rate %';
  // Customer acquisition breakdown — for D1 acquisition sources chart
  pctAIChatTool        : Decimal(5,2)   @title : 'AI Chat Tool %';
  pctLoyaltyProgram    : Decimal(5,2)   @title : 'Loyalty Program %';
  pctMarketingCampaign : Decimal(5,2)   @title : 'Marketing Campaign %';
  pctOther             : Decimal(5,2)   @title : 'Other %';
}

/**
 * Score de saúde consolidado por unidade.
 * scoreSaude = (performancePct * 0.4) + (compliancePct * 0.4) + (scoreContrato * 0.2)
 */
entity Saude_Unidade : cuid, managed {
  unidade           : Association to Unidades;
  scoreSaude        : Decimal(5,2)  @title : '{i18n>Saude_Unidade_scoreSaude}';
  compliancePct     : Decimal(5,2)  @title : '{i18n>Saude_Unidade_compliancePct}';
  performancePct    : Decimal(5,2)  @title : '{i18n>Saude_Unidade_performancePct}';
  qtdAlertasAlta    : Integer       @title : '{i18n>Saude_Unidade_qtdAlertasAlta}';
  qtdAlertasMedia   : Integer       @title : '{i18n>Saude_Unidade_qtdAlertasMedia}';
  dataAtualizacao   : DateTime      @title : '{i18n>Saude_Unidade_dataAtualizacao}';
  // 1=vermelho (<45), 2=amarelo (45–69), 3=verde (>=70)
  scoreCriticality  : Integer       @title : '{i18n>Saude_Unidade_scoreCriticality}' @Core.Computed: true;
}

/**
 * View analítica para o Painel da Rede (Analytical List Page).
 * Agregável por cluster/região/criticidade — permite chart de distribuição.
 */
@Aggregation.ApplySupported: {
  Transformations       : ['aggregate', 'groupby', 'filter'],
  GroupableProperties   : [codigo, nome, cidade, cluster_code, regiao_code, scoreCriticality, emReforma],
  AggregatableProperties: [
    { Property: ID },
    { Property: scoreSaude },
    { Property: compliancePct },
    { Property: performancePct },
    { Property: qtdAlertasAlta },
    { Property: qtdAlertasMedia }
  ]
}
@Analytics.entity: true
view Saude_Dashboard as select from Saude_Unidade {
  key ID,
  unidade.codigo         as codigo,
  unidade.nome           as nome,
  unidade.cidade         as cidade,
  unidade.estado         as estado,
  unidade.cluster.code   as cluster_code,
  unidade.regiao.code    as regiao_code,
  unidade.lat            as lat,
  unidade.lon            as lon,
  unidade.emReforma      as emReforma,
  scoreSaude,
  compliancePct,
  performancePct,
  qtdAlertasAlta,
  qtdAlertasMedia,
  scoreCriticality,
  // Texto da criticidade para o chart agrupar/rotular (padrão sflight: dimensão + texto)
  case scoreCriticality
    when 1 then 'Critical'
    when 2 then 'Warning'
    when 3 then 'Healthy'
    else 'N/A'
  end                    as criticalityText : String(20)
};


entity Alertas : cuid, managed {
  unidade       : Association to Unidades @title : '{i18n>Unidades}';
  tipo          : Association to TipoAlerta @title : '{i18n>Alertas_tipo}';
  severidade    : Association to Severidade @title : '{i18n>Alertas_severidade}';
  descricao     : String(500) @title : '{i18n>Alertas_descricao}';
  status        : Association to StatusAlerta @title : '{i18n>Alertas_status}';
  dataGeracao   : DateTime    @title : '{i18n>Alertas_dataGeracao}';
  dataResolucao : DateTime    @title : '{i18n>Alertas_dataResolucao}';
}

/**
 * Médias anonimizadas da rede por cluster e período.
 */
entity Benchmark_Cluster : cuid, managed {
  cluster          : Association to Cluster @title : '{i18n>Unidades_cluster}';
  periodo          : String(6)     @title : '{i18n>KPI_Unidade_periodo}';
  faturamentoMedio : Decimal(15,2) @title : '{i18n>Benchmark_Cluster_faturamentoMedio}';
  ticketMedioMedio : Decimal(10,2) @title : '{i18n>Benchmark_Cluster_ticketMedioMedio}';
  crescimentoMedio : Decimal(5,2)  @title : '{i18n>Benchmark_Cluster_crescimentoMedio}';
  npsMedio         : Decimal(4,1)  @title : '{i18n>Benchmark_Cluster_npsMedio}';
  qtdUnidades      : Integer       @title : '{i18n>Benchmark_Cluster_qtdUnidades}';
}


// ═══════════════════════════════════════════════════════════
// COMPLIANCE — Catálogo, Desvios, Notificações, Regras
// ═══════════════════════════════════════════════════════════

entity Catalogos : cuid, managed {
  nome           : String(100) @title : '{i18n>Catalogos_nome}';
  descricao      : String(500) @title : '{i18n>Catalogos_descricao}';
  vigenciaInicio : Date        @title : '{i18n>Catalogos_vigenciaInicio}';
  vigenciaFim    : Date        @title : '{i18n>Catalogos_vigenciaFim}';
  status         : Association to StatusCatalogo @title : '{i18n>Catalogos_status}';
  itens          : Composition of many ItensCatalogo
                     on itens.catalogo = $self;
}

entity ItensCatalogo : cuid, managed {
  catalogo      : Association to Catalogos @title : '{i18n>Catalogos}';
  sku           : String(50)    @title : '{i18n>ItensCatalogo_sku}';
  nomeProduto   : String(150)   @title : '{i18n>ItensCatalogo_nomeProduto}';
  categoria     : String(100)   @title : '{i18n>ItensCatalogo_categoria}';
  subCategoria  : String(100)   @title : '{i18n>ItensCatalogo_subCategoria}';  // ex: Moda, Acessórios, Beleza
  precoMinimo   : Decimal(10,2) @title : '{i18n>ItensCatalogo_precoMinimo}';
  precoMaximo   : Decimal(10,2) @title : '{i18n>ItensCatalogo_precoMaximo}';
  precoSugerido : Decimal(10,2) @title : '{i18n>ItensCatalogo_precoSugerido}';
  ativo         : Boolean default true;
}

entity VendaPraticada : cuid, managed {
  unidade        : Association to Unidades @title : '{i18n>Unidades}';
  periodo        : String(6)    @title : '{i18n>KPI_Unidade_periodo}';
  sku            : String(50)   @title : '{i18n>ItensCatalogo_sku}';
  nomeProduto    : String(150)  @title : '{i18n>ItensCatalogo_nomeProduto}';
  precoPraticado : Decimal(10,2)@title : '{i18n>VendaPraticada_precoPraticado}';
  qtdVendida     : Integer      @title : '{i18n>VendaPraticada_qtdVendida}';
  dataCaptura    : DateTime     @title : '{i18n>VendaPraticada_dataCaptura}';
}

entity Desvios : cuid, managed {
  unidade              : Association to Unidades @title : '{i18n>Unidades}';
  tipo                 : Association to TipoDesvio @title : '{i18n>Desvios_tipo}';
  sku                  : String(50)    @title : '{i18n>ItensCatalogo_sku}';
  nomeProduto          : String(150)   @title : '{i18n>ItensCatalogo_nomeProduto}';
  precoAutorizado      : Decimal(10,2) @title : '{i18n>Desvios_precoAutorizado}';
  precoPraticado       : Decimal(10,2) @title : '{i18n>VendaPraticada_precoPraticado}';
  percentualDesvio     : Decimal(5,2)  @title : '{i18n>Desvios_percentualDesvio}';
  severidade           : Association to Severidade @title : '{i18n>Desvios_severidade}';
  status               : Association to StatusDesvio @title : '{i18n>Desvios_status}';
  dataDeteccao         : DateTime      @title : '{i18n>Desvios_dataDeteccao}';
  dataResolucao        : DateTime      @title : '{i18n>Desvios_dataResolucao}';
  // 1=vermelho (Alta), 2=amarelo (Media), 3=verde (Baixa)
  severidadeCriticality: Integer       @title : '{i18n>Desvios_severidadeCriticality}' @Core.Computed: true;
  notificacoes         : Composition of many NotificacoesCompliance
                           on notificacoes.desvio = $self;
}

/**
 * Regras configuráveis pela franqueadora — lidas em runtime pelo service handler.
 */
entity RegrasCompliance : cuid, managed {
  tipo              : Association to TipoDesvio @title : '{i18n>Desvios_tipo}';
  limiarMedia_pct   : Decimal(5,2) @title : '{i18n>RegrasCompliance_limiarMedia_pct}';
  limiarAlta_pct    : Decimal(5,2) @title : '{i18n>RegrasCompliance_limiarAlta_pct}';
  prazoCorrecao_dias: Integer      @title : '{i18n>RegrasCompliance_prazoCorrecao_dias}';
  ativa             : Boolean default true;
}

entity NotificacoesCompliance : cuid, managed {
  desvio             : Association to Desvios @title : '{i18n>Desvios}';
  unidade            : Association to Unidades @title : '{i18n>Unidades}';
  dataEnvio          : DateTime    @title : '{i18n>NotificacoesCompliance_dataEnvio}';
  prazoCorrecao      : Date        @title : '{i18n>NotificacoesCompliance_prazoCorrecao}';
  status             : Association to StatusNotificacao @title : '{i18n>NotificacoesCompliance_status}';
  comentarioResposta : String(500) @title : '{i18n>NotificacoesCompliance_comentarioResposta}';
}


// ═══════════════════════════════════════════════════════════
// FRANCHISEE PORTAL — Recomendações (geradas pelo AI Core)
// ═══════════════════════════════════════════════════════════

/**
 * Recomendações geradas por job diário via AI Core + GenAI Hub.
 */
entity Recomendacoes : cuid, managed {
  unidade     : Association to Unidades @title : '{i18n>Unidades}';
  tipo        : Association to TipoRecomendacao @title : '{i18n>Recomendacoes_tipo}';
  titulo      : String(150)   @title : '{i18n>Recomendacoes_titulo}';
  descricao   : String(2000)  @title : '{i18n>Recomendacoes_descricao}';
  prioridade  : Association to Prioridade @title : '{i18n>Recomendacoes_prioridade}';
  status      : Association to StatusRecomendacao @title : '{i18n>Recomendacoes_status}';
  dataGeracao : DateTime      @title : '{i18n>Recomendacoes_dataGeracao}';
  dataValidade: DateTime      @title : '{i18n>Recomendacoes_dataValidade}';
}


// ═══════════════════════════════════════════════════════════
// ONBOARDING — Processos, Etapas, Tarefas, Documentos
// ═══════════════════════════════════════════════════════════

entity ProcessosOnboarding : cuid, managed {
  unidade              : Association to Unidades @title : '{i18n>Unidades}';
  dataInicio           : Date        @title : '{i18n>ProcessosOnboarding_dataInicio}';
  dataPrevisaoAbertura : Date        @title : '{i18n>ProcessosOnboarding_dataPrevisaoAbertura}';
  status               : Association to StatusOnboarding @title : '{i18n>ProcessosOnboarding_status}';
  percentualConclusao  : Decimal(5,2)@title : '{i18n>ProcessosOnboarding_percentualConclusao}';
  // 1=vermelho (Suspenso/Cancelado), 2=amarelo (EmAndamento), 3=verde (Concluido)
  statusCriticality    : Integer     @title : '{i18n>ProcessosOnboarding_statusCriticality}' @Core.Computed: true;
  tarefas              : Composition of many TarefasOnboarding
                           on tarefas.processo = $self;
}

/**
 * Template de etapas configurável pela franqueadora.
 */
entity EtapasOnboarding : cuid, managed {
  nome          : String(100) @title : '{i18n>EtapasOnboarding_nome}';
  descricao     : String(500) @title : '{i18n>EtapasOnboarding_descricao}';
  ordem         : Integer     @title : '{i18n>EtapasOnboarding_ordem}';
  obrigatoria   : Boolean default true;
  prazoEstimado : Integer     @title : '{i18n>EtapasOnboarding_prazoEstimado}';
}

entity TarefasOnboarding : cuid, managed {
  processo          : Association to ProcessosOnboarding @title : '{i18n>ProcessosOnboarding}';
  etapa             : Association to EtapasOnboarding @title : '{i18n>EtapasOnboarding}';
  nome              : String(100) @title : '{i18n>TarefasOnboarding_nome}';
  status            : Association to StatusTarefa @title : '{i18n>TarefasOnboarding_status}';
  // 1=vermelho (Vencida/Bloqueada), 2=amarelo (EmAndamento), 3=verde (Concluida)
  tarefaCriticality : Integer     @title : '{i18n>TarefasOnboarding_tarefaCriticality}' @Core.Computed: true;
  responsavel       : String(100) @title : '{i18n>TarefasOnboarding_responsavel}';
  dataVencimento    : Date        @title : '{i18n>TarefasOnboarding_dataVencimento}';
  dataConclusao     : Date        @title : '{i18n>TarefasOnboarding_dataConclusao}';
  observacao        : String(500) @title : '{i18n>TarefasOnboarding_observacao}';
  documentos        : Composition of many DocumentosOnboarding
                       on documentos.tarefa = $self;
  aprovacoes        : Composition of many AprovacoesOnboarding
                       on aprovacoes.tarefa = $self;
}

entity DocumentosOnboarding : cuid, managed {
  tarefa     : Association to TarefasOnboarding @title : '{i18n>TarefasOnboarding}';
  nome       : String(100) @title : '{i18n>DocumentosOnboarding_nome}';
  tipo       : Association to TipoDocumento @title : '{i18n>DocumentosOnboarding_tipo}';
  status     : Association to StatusDocumento @title : '{i18n>DocumentosOnboarding_status}';
  url        : String(500) @title : '{i18n>DocumentosOnboarding_url}';
  dataEnvio  : DateTime    @title : '{i18n>DocumentosOnboarding_dataEnvio}';
  comentario : String(500) @title : '{i18n>DocumentosOnboarding_comentario}';
}

entity AprovacoesOnboarding : cuid, managed {
  tarefa      : Association to TarefasOnboarding @title : '{i18n>TarefasOnboarding}';
  aprovador   : String(100) @title : '{i18n>AprovacoesOnboarding_aprovador}';
  status      : Association to StatusAprovacao @title : '{i18n>AprovacoesOnboarding_status}';
  comentario  : String(500) @title : '{i18n>AprovacoesOnboarding_comentario}';
  dataDecisao : DateTime    @title : '{i18n>AprovacoesOnboarding_dataDecisao}';
}


// ═══════════════════════════════════════════════════════════
// CONTRATOS
// ═══════════════════════════════════════════════════════════

entity Contratos_Franquia : cuid, managed {
  unidade        : Association to Unidades @title : '{i18n>Unidades}';
  dataInicio     : Date         @title : '{i18n>Contratos_Franquia_dataInicio}';
  dataVencimento : Date         @title : '{i18n>Contratos_Franquia_dataVencimento}';
  status         : Association to StatusContrato @title : '{i18n>Contratos_Franquia_status}';
  valorRoyalties : Decimal(15,2)@title : '{i18n>Contratos_Franquia_valorRoyalties}';
}


// ═══════════════════════════════════════════════════════════
// ANALYTICS — KPIs por Categoria e Campanhas de Marketing
// ═══════════════════════════════════════════════════════════

/**
 * KPIs financeiros agregados por categoria de produto por unidade/período.
 * Alimenta D3 (drill-down Beleza) e D6 (tabela Margem por Categoria).
 */
entity KPI_Categoria : cuid, managed {
  unidade              : Association to Unidades @title : '{i18n>Unidades}';
  periodo              : String(6)     @title : 'Period';
  categoria            : String(100)   @title : 'Category';
  subCategoria         : String(100)   @title : 'Sub-Category';
  faturamento          : Decimal(15,2) @title : 'Revenue';
  margemBruta          : Decimal(5,2)  @title : 'Gross Margin %';
  qtdProdutos          : Integer       @title : 'SKUs Sold';
  participacao         : Decimal(5,2)  @title : 'Revenue Share %';
  meta                 : Decimal(5,2)  @title : 'Margin Target %';
  repeatPurchaseRate   : Decimal(5,2)  @title : 'Repeat Purchase Rate %';
  loyaltyParticipation : Decimal(5,2)  @title : 'Loyalty Participation %';
  conversionRate       : Decimal(5,2)  @title : 'Conversion Rate %';
}

/**
 * Campanhas de marketing da rede (Black Friday, Verão BR, etc.)
 * Usada no D6 para o gráfico de Taxa de Ativação.
 */
entity Campanhas : cuid, managed {
  nome         : String(150)  @title : '{i18n>Campanhas_nome}';
  pais         : String(50)   @title : '{i18n>Campanhas_pais}';            // BR, AR, US, CL, etc.
  dataInicio   : Date         @title : '{i18n>Campanhas_dataInicio}';
  dataFim      : Date         @title : '{i18n>Campanhas_dataFim}';
  metaAtivacao : Decimal(5,2) @title : '{i18n>Campanhas_metaAtivacao}';    // % meta (ex: 90)
  ativa        : Boolean default true;
}

/**
 * Adesão de cada unidade a cada campanha.
 * taxaAtivacao = se a loja executou a campanha (100 = sim, 0 = não, valores intermediários = parcial).
 */
entity Ativacao_Campanha_Unidade : cuid, managed {
  campanha     : Association to Campanhas @title : '{i18n>Campanhas_nome}';
  unidade      : Association to Unidades  @title : '{i18n>Unidades}';
  taxaAtivacao : Decimal(5,2)  @title : '{i18n>Ativacao_taxaAtivacao}';    // 0–100%
  dataRegistro : Date          @title : '{i18n>Ativacao_dataRegistro}';
}


// ═══════════════════════════════════════════════════════════
// ESTOQUE & REPOSIÇÃO — evitar ruptura na loja do franqueado
// Considera sazonalidade regional + calendário promocional.
// ═══════════════════════════════════════════════════════════

/**
 * Posição de estoque por SKU por unidade.
 * Base para detecção de risco de ruptura (cobertura vs. ponto de reposição).
 */
entity Estoque_Unidade : cuid, managed {
  unidade          : Association to Unidades @title : '{i18n>Unidades}';
  sku                  : String(50)   @title : 'SKU';
  nomeProduto          : String(150)  @title : 'Product';
  categoria            : String(100)  @title : 'Category';
  saldoAtual           : Integer      @title : 'On Hand';
  estoqueMinimo        : Integer      @title : 'Reorder Point';
  giroMedioDiario      : Decimal(8,2) @title : 'Daily Sales Rate';
  leadTimeDias         : Integer      @title : 'Lead Time (days)';
  coberturaDias        : Decimal(6,1) @title : 'Days Cover'           @Core.Computed: true;
  status               : Association to StatusEstoque @title : 'Status';
  estoqueCriticality   : Integer      @title : 'Criticality'          @Core.Computed: true;
  dataAtualizacao      : DateTime     @title : 'Last Updated';
  centroDistribuicao   : String(20)   @title : 'Distribution Center'; // DC-SP, DC-CWB, DC-REC, etc.
  valorImpactoStockout : Decimal(15,2)@title : 'Stockout Impact (R$)';
  pedidos              : Association to many Pedidos_Reposicao
                           on  pedidos.unidade = unidade
                           and pedidos.sku     = sku;
}

/**
 * Fator de sazonalidade da demanda por categoria × região × mês.
 * Ex.: Sandálias/Havaianas em Julho: Nordeste fator 1.8 (alta), Sul fator 0.4 (baixa).
 * O fator multiplica o giro médio para estimar a demanda real do período.
 */
entity Sazonalidade_Regional : cuid, managed {
  categoria    : String(100) @title : '{i18n>ItensCatalogo_categoria}';
  regiao       : Association to Regiao @title : '{i18n>Unidades_regiao}';
  mes          : Integer     @title : '{i18n>Sazonalidade_mes}';        // 1-12
  fatorDemanda : Decimal(4,2)@title : '{i18n>Sazonalidade_fatorDemanda}'; // 1.0 = neutro; >1 alta; <1 baixa
  observacao   : String(200) @title : '{i18n>Sazonalidade_observacao}';
}

/**
 * Calendário de campanhas/promoções que antecipam demanda.
 * O agente considera campanhas ativas/próximas ao calcular a reposição.
 */
entity Calendario_Promocional : cuid, managed {
  nome           : String(150) @title : '{i18n>Promocao_nome}';
  categoria      : String(100) @title : '{i18n>ItensCatalogo_categoria}';
  regiao         : Association to Regiao @title : '{i18n>Unidades_regiao}';  // null = todas as regiões
  dataInicio     : Date        @title : '{i18n>Promocao_dataInicio}';
  dataFim        : Date        @title : '{i18n>Promocao_dataFim}';
  upliftDemanda  : Decimal(4,2)@title : '{i18n>Promocao_upliftDemanda}';  // multiplicador extra na demanda
  ativa          : Boolean default true;
}

/**
 * Pedido de reposição gerado pelo Agente de Reposição.
 * Fluxo: PENDENTE → (aprovação BPA) → APROVADO/RECUSADO → ENVIADO → RECEBIDO.
 */
entity Pedidos_Reposicao : cuid, managed {
  unidade          : Association to Unidades @title : '{i18n>Unidades}';
  sku              : String(50)   @title : '{i18n>ItensCatalogo_sku}';
  nomeProduto      : String(150)  @title : '{i18n>ItensCatalogo_nomeProduto}';
  qtdSugerida      : Integer      @title : '{i18n>PedidoRep_qtdSugerida}';   // calculada pelo agente
  qtdAprovada      : Integer      @title : '{i18n>PedidoRep_qtdAprovada}';
  justificativa    : String(2000) @title : '{i18n>PedidoRep_justificativa}'; // texto do agente (gpt-4o)
  fornecedorSugerido: String(150) @title : '{i18n>PedidoRep_fornecedor}';
  prazoDesejado    : Date         @title : '{i18n>PedidoRep_prazoDesejado}';
  status           : Association to StatusPedidoRep @title : '{i18n>PedidoRep_status}';
  aprovador        : String(100)  @title : '{i18n>PedidoRep_aprovador}';
  dataDecisao      : DateTime     @title : '{i18n>PedidoRep_dataDecisao}';
  origem           : Association to OrigemPedido @title : '{i18n>PedidoRep_origem}';  // AGENTE | MANUAL
  // 1=vermelho (Alta urgência), 2=amarelo (Media), 3=verde (Baixa)
  urgenciaCriticality : Integer   @title : '{i18n>PedidoRep_criticality}' @Core.Computed: true;
}
