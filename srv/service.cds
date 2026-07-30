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

  entity Alertas          as projection on mf.Alertas;

  @readonly
  entity Benchmark_Cluster as projection on mf.Benchmark_Cluster;

  // ── Compliance ───────────────────────────────────────────
  entity Catalogos        as projection on mf.Catalogos;
  entity ItensCatalogo    as projection on mf.ItensCatalogo;
  entity VendaPraticada   as projection on mf.VendaPraticada;
  entity Desvios          as projection on mf.Desvios;
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
}


// ═══════════════════════════════════════════════════════════
// FRANQUEADO SERVICE
// Acesso restrito à própria unidade — requer role 'Franqueado'
// ═══════════════════════════════════════════════════════════

@path    : '/franqueado'
@requires: 'Franqueado'
service FranqueadoService {

  // ── Meus KPIs ────────────────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeusKPIs            as projection on mf.KPI_Unidade;

  // ── Minha Saúde ──────────────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MinhaSaude          as projection on mf.Saude_Unidade;

  // ── Benchmark do cluster (anonimizado) ───────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'cluster_code = $user.cluster' }])
  entity BenchmarkMeuCluster as projection on mf.Benchmark_Cluster;

  // ── Desvios de compliance ─────────────────────────────────
  @readonly
  @(restrict: [{ grant: 'READ', where: 'unidade_ID = $user.unidade_ID' }])
  entity MeusDesvios         as projection on mf.Desvios;

  // ── Notificações de compliance ────────────────────────────
  @(restrict: [{ grant: ['READ','WRITE'], where: 'unidade_ID = $user.unidade_ID' }])
  entity MinhasNotificacoes  as projection on mf.NotificacoesCompliance;

  // ── Recomendações do AI ───────────────────────────────────
  @(restrict: [{ grant: ['READ','WRITE'], where: 'unidade_ID = $user.unidade_ID' }])
  entity MinhasRecomendacoes as projection on mf.Recomendacoes;

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
