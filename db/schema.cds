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


// ═══════════════════════════════════════════════════════════
// CORE — Franqueados e Unidades (entidades raiz)
// ═══════════════════════════════════════════════════════════

entity Franqueados : cuid, managed {
  razaoSocial : String(100) @title : 'Razão Social';
  cnpj        : String(18)  @title : 'CNPJ';
  responsavel : String(100) @title : 'Responsável';
  email       : String(255) @title : 'E-mail';
  telefone    : String(20)  @title : 'Telefone';
  status      : Association to StatusFranqueado;
  unidades    : Composition of many Unidades on unidades.franqueado = $self;
}

entity Unidades : cuid, managed {
  codigo       : String(20)  @title : 'Código';
  nome         : String(100) @title : 'Unidade';
  franqueado   : Association to Franqueados;
  endereco     : String(255) @title : 'Endereço';
  cidade       : String(100) @title : 'Cidade';
  estado       : String(2)   @title : 'Estado';
  regiao       : Association to Regiao;
  cluster      : Association to Cluster;
  dataAbertura : Date        @title : 'Data de Abertura';
  status       : Association to StatusUnidade;
  // Navegação para entidades filhas via OData $expand — sem back-associations
  // para evitar problemas de resolveView no CAP 10 durante o deploy.
  // Use: /Unidades('u147')?$expand=saude,kpis,alertas,desvios
}


// ═══════════════════════════════════════════════════════════
// NETWORK — KPIs, Saúde, Alertas, Benchmark
// ═══════════════════════════════════════════════════════════

entity KPI_Unidade : cuid, managed {
  unidade        : Association to Unidades;
  periodo        : String(6)      @title : 'Período';     // YYYYMM
  faturamento    : Decimal(15,2)  @title : 'Faturamento';
  ticketMedio    : Decimal(10,2)  @title : 'Ticket Médio';
  qtdTransacoes  : Integer        @title : 'Transações';
  crescimentoMoM : Decimal(5,2)   @title : 'Cresc. MoM %';
  crescimentoYoY : Decimal(5,2)   @title : 'Cresc. YoY %';
  nps            : Decimal(4,1)   @title : 'NPS';
  statusKPI      : Association to StatusKPI;
}

/**
 * Score de saúde consolidado por unidade.
 * Calculado pelo service handler a cada novo KPI recebido:
 *   scoreSaude = (performancePct * 0.4) + (compliancePct * 0.4) + (scoreContrato * 0.2)
 */
entity Saude_Unidade : cuid, managed {
  unidade           : Association to Unidades;
  scoreSaude        : Decimal(5,2)  @title : 'Score de Saúde';  // 0–100
  compliancePct     : Decimal(5,2)  @title : 'Compliance %';
  performancePct    : Decimal(5,2)  @title : 'Performance %';
  qtdAlertasAlta    : Integer       @title : 'Alertas Alta';
  qtdAlertasMedia   : Integer       @title : 'Alertas Média';
  dataAtualizacao   : DateTime      @title : 'Atualizado em';
  // 1=vermelho (<45), 2=amarelo (45–69), 3=verde (>=70) — usado pelo ALP para colorir colunas
  scoreCriticality  : Integer       @title : 'Criticidade' @Core.Computed: true;
}

entity Alertas : cuid, managed {
  unidade       : Association to Unidades;
  tipo          : Association to TipoAlerta;
  severidade    : Association to Severidade;
  descricao     : String(500) @title : 'Descrição';
  status        : Association to StatusAlerta;
  dataGeracao   : DateTime    @title : 'Gerado em';
  dataResolucao : DateTime    @title : 'Resolvido em';
}

/**
 * Médias anonimizadas da rede por cluster e período.
 * Exposto ao franqueado apenas como agregação — nunca dados individuais.
 */
entity Benchmark_Cluster : cuid, managed {
  cluster          : Association to Cluster;
  periodo          : String(6)     @title : 'Período';
  faturamentoMedio : Decimal(15,2) @title : 'Fat. Médio';
  ticketMedioMedio : Decimal(10,2) @title : 'TM Médio';
  crescimentoMedio : Decimal(5,2)  @title : 'Cresc. Médio %';
  npsMedio         : Decimal(4,1)  @title : 'NPS Médio';
  qtdUnidades      : Integer       @title : 'Unidades na Amostra';
}


// ═══════════════════════════════════════════════════════════
// COMPLIANCE — Catálogo, Desvios, Notificações, Regras
// ═══════════════════════════════════════════════════════════

entity Catalogos : cuid, managed {
  nome           : String(100) @title : 'Catálogo';
  descricao      : String(500) @title : 'Descrição';
  vigenciaInicio : Date        @title : 'Vigência Início';
  vigenciaFim    : Date        @title : 'Vigência Fim';
  status         : Association to StatusCatalogo;
  itens          : Composition of many ItensCatalogo
                     on itens.catalogo = $self;
}

entity ItensCatalogo : cuid, managed {
  catalogo      : Association to Catalogos;
  sku           : String(50)    @title : 'SKU';
  nomeProduto   : String(150)   @title : 'Produto';
  categoria     : String(100)   @title : 'Categoria';
  precoMinimo   : Decimal(10,2) @title : 'Preço Mín.';
  precoMaximo   : Decimal(10,2) @title : 'Preço Máx.';
  precoSugerido : Decimal(10,2) @title : 'Preço Sugerido';
  ativo         : Boolean default true;
}

entity VendaPraticada : cuid, managed {
  unidade        : Association to Unidades;
  periodo        : String(6)    @title : 'Período';
  sku            : String(50)   @title : 'SKU';
  nomeProduto    : String(150)  @title : 'Produto';
  precoPraticado : Decimal(10,2)@title : 'Preço Praticado';
  qtdVendida     : Integer      @title : 'Qtd. Vendida';
  dataCaptura    : DateTime     @title : 'Capturado em';
}

entity Desvios : cuid, managed {
  unidade              : Association to Unidades;
  tipo                 : Association to TipoDesvio;
  sku                  : String(50)    @title : 'SKU';
  nomeProduto          : String(150)   @title : 'Produto';
  precoAutorizado      : Decimal(10,2) @title : 'Preço Autorizado';
  precoPraticado       : Decimal(10,2) @title : 'Preço Praticado';
  percentualDesvio     : Decimal(5,2)  @title : 'Desvio %';
  severidade           : Association to Severidade;
  status               : Association to StatusDesvio;
  dataDeteccao         : DateTime      @title : 'Detectado em';
  dataResolucao        : DateTime      @title : 'Resolvido em';
  // 1=vermelho (Alta), 2=amarelo (Media), 3=verde (Baixa)
  severidadeCriticality: Integer       @title : 'Criticidade' @Core.Computed: true;
  notificacoes         : Composition of many NotificacoesCompliance
                           on notificacoes.desvio = $self;
}

/**
 * Regras configuráveis pela franqueadora — lidas em runtime pelo service handler.
 * Permite ajustar limiares de severidade sem alterar código.
 */
entity RegrasCompliance : cuid, managed {
  tipo              : Association to TipoDesvio;
  limiarMedia_pct   : Decimal(5,2) @title : 'Limiar Média %';
  limiarAlta_pct    : Decimal(5,2) @title : 'Limiar Alta %';
  prazoCorrecao_dias: Integer      @title : 'Prazo Correção (dias)';
  ativa             : Boolean default true;
}

entity NotificacoesCompliance : cuid, managed {
  desvio             : Association to Desvios;
  unidade            : Association to Unidades;
  dataEnvio          : DateTime    @title : 'Enviada em';
  prazoCorrecao      : Date        @title : 'Prazo';
  status             : Association to StatusNotificacao;
  comentarioResposta : String(500) @title : 'Resposta do Franqueado';
}


// ═══════════════════════════════════════════════════════════
// FRANCHISEE PORTAL — Recomendações (geradas pelo AI Core)
// ═══════════════════════════════════════════════════════════

/**
 * Recomendações geradas por job diário via AI Core + GenAI Hub.
 * Persistidas no HANA — não são inferência em tempo real.
 * Prompt estruturado inclui: KPIs da unidade, benchmark do cluster,
 * desvios abertos e alertas ativos.
 */
entity Recomendacoes : cuid, managed {
  unidade     : Association to Unidades;
  tipo        : Association to TipoRecomendacao;
  titulo      : String(150)   @title : 'Título';
  descricao   : String(2000)  @title : 'Descrição';
  prioridade  : Association to Prioridade;
  status      : Association to StatusRecomendacao;
  dataGeracao : DateTime      @title : 'Gerada em';
  dataValidade: DateTime      @title : 'Válida até';
}


// ═══════════════════════════════════════════════════════════
// ONBOARDING — Processos, Etapas, Tarefas, Documentos
// ═══════════════════════════════════════════════════════════

entity ProcessosOnboarding : cuid, managed {
  unidade              : Association to Unidades;
  dataInicio           : Date        @title : 'Início';
  dataPrevisaoAbertura : Date        @title : 'Previsão de Abertura';
  status               : Association to StatusOnboarding;
  percentualConclusao  : Decimal(5,2)@title : '% Conclusão';
  tarefas              : Composition of many TarefasOnboarding
                           on tarefas.processo = $self;
}

/**
 * Template de etapas configurável pela franqueadora.
 * Ex: 1-Documentação, 2-Obra, 3-Estoque, 4-Treinamento, 5-Inauguração.
 */
entity EtapasOnboarding : cuid, managed {
  nome          : String(100) @title : 'Etapa';
  descricao     : String(500) @title : 'Descrição';
  ordem         : Integer     @title : 'Ordem';
  obrigatoria   : Boolean default true;
  prazoEstimado : Integer     @title : 'Prazo Estimado (dias)';
}

entity TarefasOnboarding : cuid, managed {
  processo       : Association to ProcessosOnboarding;
  etapa          : Association to EtapasOnboarding;
  nome           : String(100) @title : 'Tarefa';
  status         : Association to StatusTarefa;
  responsavel    : String(100) @title : 'Responsável';
  dataVencimento : Date        @title : 'Vencimento';
  dataConclusao  : Date        @title : 'Concluída em';
  observacao     : String(500) @title : 'Observação';
  documentos     : Composition of many DocumentosOnboarding
                     on documentos.tarefa = $self;
  aprovacoes     : Composition of many AprovacoesOnboarding
                     on aprovacoes.tarefa = $self;
}

entity DocumentosOnboarding : cuid, managed {
  tarefa     : Association to TarefasOnboarding;
  nome       : String(100) @title : 'Documento';
  tipo       : Association to TipoDocumento;
  status     : Association to StatusDocumento;
  url        : String(500) @title : 'URL';
  dataEnvio  : DateTime    @title : 'Enviado em';
  comentario : String(500) @title : 'Comentário';
}

entity AprovacoesOnboarding : cuid, managed {
  tarefa      : Association to TarefasOnboarding;
  aprovador   : String(100) @title : 'Aprovador';
  status      : Association to StatusAprovacao;
  comentario  : String(500) @title : 'Comentário';
  dataDecisao : DateTime    @title : 'Decisão em';
}


// ═══════════════════════════════════════════════════════════
// CONTRATOS
// ═══════════════════════════════════════════════════════════

entity Contratos_Franquia : cuid, managed {
  unidade        : Association to Unidades;
  dataInicio     : Date         @title : 'Início';
  dataVencimento : Date         @title : 'Vencimento';
  status         : Association to StatusContrato;
  valorRoyalties : Decimal(15,2)@title : 'Royalties Mensais';
}
