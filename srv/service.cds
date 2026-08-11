using { myfranchise as mf } from '../db/schema';

// ═══════════════════════════════════════════════════════════
// FRANQUEADORA SERVICE  —  /franqueadora
// Full network visibility — Carlos Mendes persona
// ═══════════════════════════════════════════════════════════

@path    : '/franqueadora'
@requires: 'Franqueadora_Gestor'
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
}


// ═══════════════════════════════════════════════════════════
// FRANQUEADO SERVICE  —  /franqueado
// Store-level view — Marina Santos persona
// Filtering by store is done via $filter on the frontend (URL param).
// ═══════════════════════════════════════════════════════════

@path    : '/franqueado'
@requires: 'Franqueado'
service FranqueadoService {

  // Same views as franqueadora — franchisee filters by store via $filter
  @readonly entity MyStockAlerts   as projection on mf.StockoutAlert;
  @readonly entity MyNps           as projection on mf.StoreNps;
  @readonly entity MyOrders        as projection on mf.OrderSummary;
  @readonly entity MyOrderItems    as projection on mf.OrderItemDetail;
  @readonly entity MyForecasts     as projection on mf.DemandForecast;
}
