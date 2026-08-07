using { myfranchise as mf } from '../db/schema';

// ═══════════════════════════════════════════════════════════
// FRANQUEADORA SERVICE
// Acesso completo à rede — requer role 'Franqueadora_Gestor'
// ═══════════════════════════════════════════════════════════

@path    : '/franqueadora'
@requires: 'Franqueadora_Gestor'
service FranqueadoraService {

  // ── Core ────────────────────────────────────────────────
  entity Franqueados  as projection on mf.Franqueados;
  entity Unidades     as projection on mf.Unidades;

  // ── Painel da Rede ───────────────────────────────────────
  @readonly
  entity Saude_Unidade    as projection on mf.Saude_Unidade;

  @readonly
  entity Saude_Dashboard  as projection on mf.Saude_Dashboard;

  @readonly
  entity KPI_Unidade      as projection on mf.KPI_Unidade;

  @readonly
  entity KPI_Rede         as projection on mf.KPI_Rede;

  @readonly
  entity Atividades_Rede  as projection on mf.Atividades_Rede {
    *,
    case status
      when 'APROVADO' then 3
      when 'PENDENTE' then 2
      else 1
    end as statusCriticality : Integer
  };

  entity Alertas          as projection on mf.Alertas;

  @readonly
  entity Benchmark_Cluster as projection on mf.Benchmark_Cluster;

  // ── Compliance ───────────────────────────────────────────
  entity Catalogos        as projection on mf.Catalogos;
  entity ItensCatalogo    as projection on mf.ItensCatalogo;
  entity VendaPraticada   as projection on mf.VendaPraticada;
  entity Desvios          as projection on mf.Desvios {
    *,
    unidade.nome   as unidadeNome  : String,
    unidade.cidade as unidadeCidade: String
  };
  entity RegrasCompliance as projection on mf.RegrasCompliance;
  entity NotificacoesCompliance as projection on mf.NotificacoesCompliance;

  // ── Recomendações ────────────────────────────────────────
  entity Recomendacoes    as projection on mf.Recomendacoes;

  // Ações de IA — geração de recomendações via AI Core / GenAI Hub
  // (com fallback baseado em regras quando o AI Core não está disponível)
  action gerarRecomendacoes(unidade_ID : String) returns {
    unidade_ID    : String;
    recomendacoes : Integer;
    modo          : String;
  };
  action gerarRecomendacoesTodas() returns {
    unidades      : Integer;
    recomendacoes : Integer;
    modo          : String;
  };

  // ── Onboarding ───────────────────────────────────────────
  @odata.draft.enabled
  entity ProcessosOnboarding  as projection on mf.ProcessosOnboarding;
  entity EtapasOnboarding     as projection on mf.EtapasOnboarding;
  entity TarefasOnboarding    as projection on mf.TarefasOnboarding;
  entity DocumentosOnboarding as projection on mf.DocumentosOnboarding;
  entity AprovacoesOnboarding as projection on mf.AprovacoesOnboarding;

  // ── Contratos ─────────────────────────────────────────────
  entity Contratos_Franquia as projection on mf.Contratos_Franquia;

  // ── Analytics — KPI por Categoria e Campanhas ────────────
  @readonly
  entity KPI_Categoria          as projection on mf.KPI_Categoria {
    *,
    unidade.nome        as unidadeNome   : String,
    unidade.regiao.code as regiaoCode    : String,
    unidade.cluster.code as clusterCode  : String
  };

  @readonly
  entity Campanhas              as projection on mf.Campanhas;

  @readonly
  entity Ativacao_Campanha_Unidade as projection on mf.Ativacao_Campanha_Unidade {
    *,
    unidade.nome        as unidadeNome   : String,
    unidade.regiao.code as regiaoCode    : String,
    campanha.nome       as campanhaNome  : String,
    campanha.metaAtivacao as metaAtivacao : Decimal(5,2)
  };

  // ── Estoque & Reposição ──────────────────────────────────
  // Nota: drill-down (List Report → Object Page) NÃO habilitado — o FE V4 marca
  // as linhas como "Active" (não "Navigation") em todos os apps deste projeto,
  // apesar de navigation/SemanticKey/draft configurados como no sflight. Causa
  // raiz em investigação (comportamento do sap.fe runtime). A tabela já mostra
  // tudo (loja/região/cobertura/status) em uma linha; drill-down é evolução.
  @readonly
  entity Estoque_Unidade        as projection on mf.Estoque_Unidade {
    *,
    unidade.nome         as unidadeNome    : String,
    unidade.codigo       as unidadeCodigo  : String,
    unidade.cidade       as unidadeCidade  : String,
    unidade.regiao.code  as regiaoCode     : String,
    unidade.cluster.code as clusterCode    : String,
    unidade.tipoLoja     as tipoLoja       : String,
    pedidos
  };
  @readonly
  entity Substitutos            as projection on mf.Substitutos {
    *,
    unidade.nome         as unidadeNome    : String
  };
  @readonly
  entity Sazonalidade_Regional  as projection on mf.Sazonalidade_Regional;
  @readonly
  entity Calendario_Promocional as projection on mf.Calendario_Promocional;
  entity Pedidos_Reposicao      as projection on mf.Pedidos_Reposicao {
    *,
    unidade.nome        as unidadeNome   : String,
    unidade.cidade      as unidadeCidade : String,
    unidade.regiao.code as regiaoCode    : String,
    origem.name         as origemLabel   : String
  } actions {
    action aprovar(qtdAprovada : Integer, observacao : String) returns {
      status   : String;
      mensagem : String;
    };
    action recusar(motivo : String) returns {
      status   : String;
      mensagem : String;
    };
  };

  // Agente de Reposição — detecta risco de ruptura e gera pedidos (gpt-4o)
  action gerarReposicao(unidade_ID : String) returns {
    unidade_ID : String;
    pedidos    : Integer;
    modo       : String;
  };
  action gerarReposicaoTodas() returns {
    unidades : Integer;
    pedidos  : Integer;
    modo     : String;
  };

  // Reset de demo — volta todos os pedidos para PENDENTE e limpa decisões
  action resetarDemo() returns {
    pedidos  : Integer;
    mensagem : String;
  };

  // Simula uma enxurrada de vendas que leva os estoques a ruptura
  action simularVendas() returns {
    rupturas : Integer;
    mensagem : String;
  };

  // Simulação de recebimento — marca pedidos APROVADO como RECEBIDO e repõe o estoque
  action simularRecebimento() returns {
    pedidos  : Integer;
    mensagem : String;
  };

  // KPI para tiles do Work Zone
  function rupturaCount()  returns Integer;
  function pedidosPendentesCount() returns Integer;

  // ── Code Lists ───────────────────────────────────────────
  @readonly entity StatusFranqueado   as projection on mf.StatusFranqueado;
  @readonly entity StatusUnidade      as projection on mf.StatusUnidade;
  @readonly entity Regiao             as projection on mf.Regiao;
  @readonly entity Cluster            as projection on mf.Cluster;
  @readonly entity StatusKPI          as projection on mf.StatusKPI;
  @readonly entity TipoAlerta         as projection on mf.TipoAlerta;
  @readonly entity Severidade         as projection on mf.Severidade;
  @readonly entity StatusAlerta       as projection on mf.StatusAlerta;
  @readonly entity TipoDesvio         as projection on mf.TipoDesvio;
  @readonly entity StatusDesvio       as projection on mf.StatusDesvio;
  @readonly entity TipoRecomendacao   as projection on mf.TipoRecomendacao;
  @readonly entity Prioridade         as projection on mf.Prioridade;
  @readonly entity StatusOnboarding   as projection on mf.StatusOnboarding;
  @readonly entity StatusTarefa       as projection on mf.StatusTarefa;
  @readonly entity TipoDocumento      as projection on mf.TipoDocumento;
  @readonly entity StatusContrato     as projection on mf.StatusContrato;
  @readonly entity StatusEstoque      as projection on mf.StatusEstoque;
  @readonly entity StatusPedidoRep    as projection on mf.StatusPedidoRep;
  @readonly entity OrigemPedido       as projection on mf.OrigemPedido;
}


// ═══════════════════════════════════════════════════════════
// FRANQUEADO SERVICE
// Acesso restrito à própria unidade — requer role 'Franqueado'
// ═══════════════════════════════════════════════════════════

@path    : '/franqueado'
@requires: 'Franqueado'
@impl    : 'srv/franqueado-service.js'
service FranqueadoService {

  // ── Meus KPIs ────────────────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeusKPIs            as projection on mf.KPI_Unidade {
    *,
    unidade.nome   as unidadeNome   : String,
    unidade.cidade as unidadeCidade : String,
    'BRL'          as moeda         : String(3) @Common.IsCurrency,
    case substring(periodo, 4, 2)
      when '01' then 'Jan' when '02' then 'Fev' when '03' then 'Mar'
      when '04' then 'Abr' when '05' then 'Mai' when '06' then 'Jun'
      when '07' then 'Jul' when '08' then 'Ago' when '09' then 'Set'
      when '10' then 'Out' when '11' then 'Nov' when '12' then 'Dez'
      else substring(periodo, 4, 2)
    end || '/' || substring(periodo, 0, 4) as periodoLabel : String(8)
  };

  // ── Minha Saúde ──────────────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MinhaSaude          as projection on mf.Saude_Unidade {
    *,
    unidade.nome   as unidadeNome   : String,
    unidade.cidade as unidadeCidade : String
  };

  // ── Benchmark do cluster (anonimizado) ───────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'cluster_code = $user.cluster' }])
  entity BenchmarkMeuCluster as projection on mf.Benchmark_Cluster {
    *,
    'BRL' as moeda : String(3) @Common.IsCurrency,
    case substring(periodo, 4, 2)
      when '01' then 'Jan' when '02' then 'Fev' when '03' then 'Mar'
      when '04' then 'Abr' when '05' then 'Mai' when '06' then 'Jun'
      when '07' then 'Jul' when '08' then 'Ago' when '09' then 'Set'
      when '10' then 'Out' when '11' then 'Nov' when '12' then 'Dez'
      else substring(periodo, 4, 2)
    end || '/' || substring(periodo, 0, 4) as periodoLabel : String(8)
  };

  // ── Desvios de compliance ─────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeusDesvios         as projection on mf.Desvios {
    *,
    unidade.nome as unidadeNome : String,
    case severidade.code
      when 'ALTA'  then 1
      when 'MEDIA' then 2
      when 'BAIXA' then 3
      else 0
    end as severidadeCrit : Integer
  };

  // ── Notificações de compliance ────────────────────────────
  @(restrict: [{ grant: ['READ','WRITE'], where: 'unidade_ID = $user.unidade_ID' }])
  entity MinhasNotificacoes  as projection on mf.NotificacoesCompliance;

  // ── Meu Estoque / Reposição ──────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeuEstoque          as projection on mf.Estoque_Unidade {
    *,
    unidade.nome          as unidadeNome : String,
    unidade.regiao.code   as regiaoCode  : String
  };

  // ── Substitutos disponíveis na minha loja ─────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID or unidade_ID is null' }])
  entity MeusSubstitutos     as projection on mf.Substitutos {
    *,
    unidade.nome          as unidadeNome : String
  };

  @(restrict: [{ grant: ['READ','WRITE'], where: 'unidade_ID = $user.unidade_ID' }])
  entity MinhasReposicoes    as projection on mf.Pedidos_Reposicao {
    *,
    unidade.nome as unidadeNome : String
  };

  // ── Recomendações do AI ───────────────────────────────────
  @(restrict: [{ grant: ['READ','WRITE'], where: 'unidade_ID = $user.unidade_ID' }])
  entity MinhasRecomendacoes as projection on mf.Recomendacoes {
    *,
    unidade.nome as unidadeNome : String,
    case prioridade.code
      when 'ALTA'  then 1
      when 'MEDIA' then 2
      when 'BAIXA' then 3
      else 0
    end as prioridadeCrit : Integer
  };

  // ── KPI por Categoria ────────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeusKPI_Categoria   as projection on mf.KPI_Categoria {
    *,
    unidade.nome         as unidadeNome   : String,
    unidade.cidade       as unidadeCidade : String,
    unidade.regiao.code  as regiaoCode    : String,
    case substring(periodo, 4, 2)
      when '01' then 'Jan' when '02' then 'Feb' when '03' then 'Mar'
      when '04' then 'Apr' when '05' then 'May' when '06' then 'Jun'
      when '07' then 'Jul' when '08' then 'Aug' when '09' then 'Sep'
      when '10' then 'Oct' when '11' then 'Nov' when '12' then 'Dec'
      else substring(periodo, 4, 2)
    end || '/' || substring(periodo, 0, 4) as periodoLabel : String(8),
    // 3=green (>=meta), 2=yellow (meta-5 to meta), 1=red (<meta-5)
    case
      when margemBruta >= meta       then 3
      when margemBruta >= meta - 5.0 then 2
      else 1
    end as margemCriticality : Integer
  };

  // ── Campanhas da minha loja ──────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MinhasAtivacoes     as projection on mf.Ativacao_Campanha_Unidade {
    *,
    unidade.nome          as unidadeNome    : String,
    campanha.nome         as campanhaNome   : String,
    campanha.metaAtivacao as metaAtivacao   : Decimal(5,2),
    campanha.dataInicio   as campanhaInicio : Date,
    campanha.dataFim      as campanhaFim    : Date,
    // 3=green (>=meta), 2=yellow (meta-15 to meta), 1=red (<meta-15)
    case
      when taxaAtivacao >= campanha.metaAtivacao             then 3
      when taxaAtivacao >= campanha.metaAtivacao - 15.0      then 2
      else 1
    end as ativacaoCriticality : Integer
  };

  // ── Onboarding ───────────────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeuOnboarding       as projection on mf.ProcessosOnboarding;

  @(restrict: [{ grant: 'READ', where: 'processo.unidade_ID = $user.unidade_ID' }])
  entity MinhasTarefas       as projection on mf.TarefasOnboarding;

  @(restrict: [{ grant: 'READ', where: 'tarefa.processo.unidade_ID = $user.unidade_ID' }])
  entity MeusDocumentos      as projection on mf.DocumentosOnboarding;

  // ── Meu Contrato ─────────────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeuContrato         as projection on mf.Contratos_Franquia;

  // ── Alertas ──────────────────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeusAlertas         as projection on mf.Alertas;

  // ── Code Lists necessários ───────────────────────────────
  @readonly entity Severidade         as projection on mf.Severidade;
  @readonly entity TipoDesvio         as projection on mf.TipoDesvio;
  @readonly entity TipoRecomendacao   as projection on mf.TipoRecomendacao;
  @readonly entity Prioridade         as projection on mf.Prioridade;
  @readonly entity StatusRecomendacao as projection on mf.StatusRecomendacao;
  @readonly entity StatusTarefa       as projection on mf.StatusTarefa;
}
