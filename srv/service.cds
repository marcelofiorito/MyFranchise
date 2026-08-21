using { myfranchise as mf } from '../db/schema';

// ═══════════════════════════════════════════════════════════
// FRANQUEADORA SERVICE  —  /franqueadora
// Full network visibility — Carlos Mendes persona
// ═══════════════════════════════════════════════════════════

@path    : '/franqueadora'
service FranqueadoraService {

  // Stockout alerts — enriched view (Inventory + Store + Material + Forecast)
  @readonly entity StockoutAlerts  as projection on mf.StockoutAlert;

  // NPS responses enriched with store info
  @readonly entity NpsResponses    as projection on mf.StoreNps;

  // Replenishment orders (header + items)
  @readonly entity Orders          as projection on mf.OrderSummary;
  @readonly entity OrderItems      as projection on mf.OrderItemDetail;

  // Demand forecast
  @readonly entity DemandForecasts as projection on mf.DemandForecast;

  // Master data
  @readonly entity Stores          as projection on mf.Store;
  @readonly entity Materials       as projection on mf.Material;
  @readonly entity Substitutes     as projection on mf.Substitute;
  @readonly entity Franchisees     as projection on mf.Franchisee;
  @readonly entity Campaigns       as projection on mf.Campaign;
  @readonly entity CampaignItems   as projection on mf.CampaignItem;
  @readonly entity ExternalEvents  as projection on mf.ExtEvent;
  @readonly entity WeatherForecasts as projection on mf.ExtWeather;
  @readonly entity ArticleGrades   as projection on mf.ArticleGrade;
  @readonly entity Countries       as projection on mf.Country;

  // Sellout (consumer sales)
  @readonly entity SelloutOrders   as projection on mf.SelloutSummary;
  @readonly entity SelloutItems    as projection on mf.SelloutItemDetail;

  // Target vs Actual
  @readonly entity SalesTargets    as projection on mf.ActualVsTarget;
}


// ═══════════════════════════════════════════════════════════
// FRANQUEADO SERVICE  —  /franqueado
// Store-level view — Marina Santos persona
// Filtering by store is done via $filter on the frontend (URL param).
// ═══════════════════════════════════════════════════════════

@path    : '/franqueado'
service FranqueadoService {

  // Same views as franqueadora — franchisee filters by store via $filter
  @readonly entity MyStockAlerts   as projection on mf.StockoutAlert;
  @readonly entity MyNps           as projection on mf.StoreNps;
  @readonly entity MyOrders        as projection on mf.OrderSummary;
  @readonly entity MyOrderItems    as projection on mf.OrderItemDetail;
  @readonly entity MyForecasts     as projection on mf.DemandForecast;
  @readonly entity MySellout       as projection on mf.SelloutSummary;
  @readonly entity MySelloutItems  as projection on mf.SelloutItemDetail;
  @readonly entity MyTarget        as projection on mf.ActualVsTarget;

  // Store entity — root for the franchisee List Report + Object Page
  // Filtered to BR-SP-001 (Marina Santos) — simulates per-franchisee data isolation
  @readonly entity MyStore as projection on mf.Store {
    key STORE_ID,
    STORE_NAME,
    FRANCHISEE_ID,
    CITY,
    REGION,
    STATUS,
    OPEN_DATE,
    IMAGE_URL,
    AVG_NPS,
    stockAlerts  : Association to many MyStockAlerts on stockAlerts.STORE_ID  = $self.STORE_ID,
    orders       : Association to many MyOrders      on orders.STORE_ID       = $self.STORE_ID,
    npsResponses : Association to many MyNps         on npsResponses.STORE_ID = $self.STORE_ID
  } where STORE_ID = 'BR-SP-001'
}
