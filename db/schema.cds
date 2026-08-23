namespace myfranchise;

// ═══════════════════════════════════════════════════════════
// Base tables — mapped 1:1 to RUNMYFRANCHISE_MF via synonyms
// CDS does not manage these tables; HANA owns them.
// ═══════════════════════════════════════════════════════════

@cds.persistence.exists
@readonly
entity Store {
  key STORE_ID       : String(20);
      STORE_NAME     : String(100);
      FRANCHISEE_ID  : String(10);
      COUNTRY_CODE   : String(2);
      CITY           : String(50);
      REGION         : String(50);
      ADDRESS        : String(200);
      OPEN_DATE      : Date;
      STATUS         : String(1);  // A=Active, I=Inactive
      FLOOR_AREA_SQM : Decimal(8,2);
      IMAGE_URL      : String(500);
      AVG_NPS        : Decimal(5,1);
}

@cds.persistence.exists
@readonly
entity InventorySnapshot {
  key STORE_ID       : String(20);
  key MATNR          : String(40);
  key COLOR          : String(50);
  key SIZE_VAL       : String(10);
  key SNAPSHOT_DATE  : Date;
      QTY_ON_HAND    : Integer;
      QTY_RESERVED   : Integer;
      QTY_IN_TRANSIT : Integer;
      STOCK_STATUS   : String(1);  // R=Critical, Y=Attention, G=OK
      SCENARIO       : String(4);
}

@cds.persistence.exists
@readonly
entity NpsResponse {
  key NPS_ID      : String(20);
      STORE_ID    : String(20);
      SURVEY_DATE : Date;
      SCORE       : Integer;
      CATEGORY    : String(20);
      VERBATIM    : String(500);
      RECEIPT_ID  : String(20);
}

@cds.persistence.exists
@readonly
entity SellinHdr {
  key ORDER_ID           : String(15);
      STORE_ID           : String(20);
      ORDER_DATE         : Date;
      STATUS             : String(10);  // PENDING, DELIVERED, DRAFT
      TOTAL_AMOUNT       : Decimal(15,2);
      CURRENCY           : String(3);
      EXPECTED_DELIVERY  : Date;
      NOTES              : String(500);
}

@cds.persistence.exists
@readonly
entity SellinItm {
  key ORDER_ID      : String(15);
  key ITEM_NUM      : Integer;
      MATNR         : String(40);
      COLOR         : String(50);
      SIZE_VAL      : String(10);
      QTY_ORDERED   : Integer;
      QTY_DELIVERED : Integer;
      UNIT_PRICE    : Decimal(15,2);
}

@cds.persistence.exists
@readonly
entity DemandForecast {
  key STORE_ID               : String(20);
  key MATNR                  : String(40);
  key COLOR                  : String(50);
  key SIZE_VAL               : String(10);
  key FORECAST_DATE          : Date;
      QTY_FORECAST           : Integer;
      CONFIDENCE_SCORE       : Decimal(5,3);
      WEATHER_IMPACT_PCT     : Decimal(6,2);
      CAMPAIGN_IMPACT_PCT    : Decimal(6,2);
      SEASONALITY_IMPACT_PCT : Decimal(6,2);
      DAYS_TO_STOCKOUT       : Integer;
      SCENARIO               : String(4);
}

@cds.persistence.exists
@readonly
entity Material {
  key MANDT          : String(3);
  key MATNR          : String(40);
      MATKL          : String(9);
      MTART          : String(4);
      MEINS          : String(3);
      COST_PRICE     : Decimal(13,2);
      RETAIL_PRICE   : Decimal(13,2);
      PRICE_CURRENCY : String(5);
      PROMO_PRICE    : Decimal(13,2);
      IMAGE_URL      : String(500);
}

@cds.persistence.exists
@readonly
entity MaterialDesc {
  key MANDT  : String(3);
  key MATNR  : String(40);
  key SPRAS  : String(2);
      MAKTX  : String(40);
}

@cds.persistence.exists
@readonly
entity Substitute {
  key SOURCE_MATNR   : String(40);
  key SOURCE_COLOR   : String(50);
  key SOURCE_SIZE    : String(10);
  key TARGET_MATNR   : String(40);
      TARGET_COLOR   : String(50);
      TARGET_SIZE    : String(10);
      SIMILARITY_PCT : Decimal(5,2);
      ACCEPTANCE_RATE: Decimal(5,2);
      PRIORITY       : Integer;
      SUGGEST_SCRIPT : String(500);
}


@cds.persistence.exists
@readonly
entity SelloutHdr {
  key RECEIPT_ID      : String(25);
      STORE_ID        : String(10);
      RECEIPT_DATE    : Date;
      RECEIPT_TS      : Timestamp;
      PAYMENT_METHOD  : String(3);
      GROSS_AMOUNT    : Decimal(15,2);
      DISCOUNT_AMOUNT : Decimal(15,2);
      NET_AMOUNT      : Decimal(15,2);
      CURRENCY        : String(3);
      CAMPAIGN_ID     : String(10);
      CUSTOMER_ID     : String(20);
}

@cds.persistence.exists
@readonly
entity SelloutItm {
  key RECEIPT_ID   : String(25);
  key ITEM_NUM     : Integer;
      MATNR        : String(40);
      COLOR        : String(30);
      SIZE_VAL     : String(10);
      QTY          : Integer;
      UNIT_PRICE   : Decimal(15,2);
      DISCOUNT_PCT : Decimal(5,2);
      NET_AMOUNT   : Decimal(15,2);
}

@cds.persistence.exists
@readonly
entity SalesTarget {
  key STORE_ID       : String(10);
  key YEAR           : Integer;
  key MONTH          : Integer;
      TARGET_AMOUNT  : Decimal(15,2);
      CURRENCY       : String(3);
}

@cds.persistence.exists
@readonly
entity DemoState {
  key ACTIVE_SCENARIO : String(4);
}

@cds.persistence.exists
@readonly
entity ExtEvent {
  key EVENT_ID          : String(15);
      COUNTRY_CODE      : String(2);
      CITY              : String(50);
      EVENT_DATE        : Date;
      EVENT_TYPE        : String(20);
      EVENT_NAME        : String(100);
      DEMAND_IMPACT_PCT : Decimal(5,2);
}

@cds.persistence.exists
@readonly
entity Campaign {
  key CAMPAIGN_ID : String(10);
      NAME        : String(100);
      TYPE        : String(20);
      START_DATE  : Date;
      END_DATE    : Date;
      DESCRIPTION : String(500);
      GLOBAL_FLAG : String(1);
      STATUS      : String(1);  // A=Active, I=Inactive
}

@cds.persistence.exists
@readonly
entity CampaignItem {
  key CAMPAIGN_ID  : String(10);
  key MATNR        : String(40);
  key COLOR        : String(30);
  key SIZE_VAL     : String(10);
      DISCOUNT_PCT : Decimal(5,2);
      BASE_PRICE   : Decimal(15,2);
      PROMO_PRICE  : Decimal(15,2);
      CURRENCY     : String(3);
}

@cds.persistence.exists
@readonly
entity Franchisee {
  key FRANCHISEE_ID  : String(10);
      NAME           : String(100);
      COUNTRY_CODE   : String(2);
      CONTRACT_DATE  : Date;
      CONTRACT_END   : Date;
      EMAIL          : String(100);
      STATUS         : String(1);
}

@cds.persistence.exists
@readonly
entity ArticleGrade {
  key MATNR    : String(40);
  key COLOR    : String(30);
  key SIZE_VAL : String(10);
      EAN      : String(18);
      IS_ACTIVE: String(1);
}

@cds.persistence.exists
@readonly
entity ExtWeather {
  key CITY              : String(50);
  key FORECAST_DATE     : Date;
      MAX_TEMP          : Decimal(5,1);
      MIN_TEMP          : Decimal(5,1);
      CONDITION         : String(30);
      HEAT_INDEX        : Decimal(5,1);
      DEMAND_IMPACT_PCT : Decimal(5,2);
}

@cds.persistence.exists
@readonly
entity Country {
  key COUNTRY_CODE  : String(2);
      COUNTRY_NAME  : String(50);
      CURRENCY_CODE : String(3);
      TIMEZONE      : String(10);
      HEMISPHERE    : String(1);
      LANGUAGE      : String(2);
}


// ═══════════════════════════════════════════════════════════
// CDS Views — enriched projections deployed as HANA SQL views
// ═══════════════════════════════════════════════════════════

// Flat stockout alert — joins Inventory + Store + Material + Forecast
@Aggregation.ApplySupported: {
  Transformations       : ['aggregate', 'groupby', 'filter'],
  GroupableProperties   : [STORE_ID, STORE_NAME, COUNTRY_CODE, REGION, MATNR, ARTICLE_NAME, COLOR, SIZE_VAL, STOCK_STATUS],
  AggregatableProperties: [
    { Property: QTY_ON_HAND },
    { Property: QTY_FORECAST },
    { Property: DAYS_TO_STOCKOUT },
    { Property: REVENUE_AT_RISK }
  ]
}
@Analytics.entity: true
view StockoutAlert as
  select from InventorySnapshot as i
  join Store as s on s.STORE_ID = i.STORE_ID
  join Material as m on m.MATNR = i.MATNR and m.MANDT = '100'
  left join MaterialDesc as d on d.MATNR = i.MATNR and d.MANDT = '100' and d.SPRAS = 'E'
  left join DemandForecast as f
         on f.STORE_ID = i.STORE_ID and f.MATNR = i.MATNR
        and f.COLOR = i.COLOR and f.SIZE_VAL = i.SIZE_VAL
        and f.SCENARIO = i.SCENARIO
{
  key i.STORE_ID,
  key i.MATNR,
  key i.COLOR,
  key i.SIZE_VAL,
      s.STORE_NAME,
      s.CITY,
      s.COUNTRY_CODE,
      s.REGION,
      i.SNAPSHOT_DATE,
      i.QTY_ON_HAND,
      i.QTY_IN_TRANSIT,
      i.STOCK_STATUS,
      coalesce(d.MAKTX, i.MATNR)                                      as ARTICLE_NAME       : String(40),
      m.RETAIL_PRICE,
      m.IMAGE_URL,
      coalesce(f.QTY_FORECAST, 0)                                      as QTY_FORECAST       : Integer,
      coalesce(f.DAYS_TO_STOCKOUT, 0)                                  as DAYS_TO_STOCKOUT   : Integer,
      coalesce(f.WEATHER_IMPACT_PCT, 0)                                as WEATHER_IMPACT_PCT : Decimal(6,2),
      coalesce(f.CAMPAIGN_IMPACT_PCT, 0)                               as CAMPAIGN_IMPACT_PCT: Decimal(6,2),
      round(coalesce(f.QTY_FORECAST, 0) * m.RETAIL_PRICE, 2)          as REVENUE_AT_RISK    : Decimal(15,2),
      case i.STOCK_STATUS when 'R' then 1 when 'Y' then 2 else 3 end  as CRITICALITY        : Integer
}
where i.STOCK_STATUS in ('R', 'Y');


// NPS enriched with store info
view StoreNps as
  select from NpsResponse as n
  join Store as s on s.STORE_ID = n.STORE_ID
{
  key n.NPS_ID,
      n.STORE_ID,
      s.STORE_NAME,
      s.CITY,
      s.REGION,
      s.COUNTRY_CODE,
      n.SURVEY_DATE,
      n.SCORE,
      n.CATEGORY,
      n.VERBATIM,
      case
        when n.SCORE >= 9 then 'Promoter'
        when n.SCORE >= 7 then 'Passive'
        else 'Detractor'
      end                                                              as NPS_CATEGORY : String(10),
      case
        when n.SCORE >= 9 then 3
        when n.SCORE >= 7 then 2
        else 1
      end                                                              as CRITICALITY  : Integer
};


// Order header enriched with store name
view OrderSummary as
  select from SellinHdr as h
  join Store as s on s.STORE_ID = h.STORE_ID
{
  key h.ORDER_ID,
      h.STORE_ID,
      s.STORE_NAME,
      s.CITY,
      s.REGION,
      h.ORDER_DATE,
      h.STATUS,
      h.TOTAL_AMOUNT,
      h.CURRENCY,
      h.EXPECTED_DELIVERY,
      h.NOTES,
      case h.STATUS
        when 'PENDING'   then 1
        when 'DRAFT'     then 2
        when 'DELIVERED' then 3
        else 2
      end                                                              as STATUS_CRITICALITY : Integer
};


// Order item with article description
view OrderItemDetail as
  select from SellinItm as i
  left join MaterialDesc as d on d.MATNR = i.MATNR and d.MANDT = '100' and d.SPRAS = 'E'
{
  key i.ORDER_ID,
  key i.ITEM_NUM,
      i.MATNR,
      coalesce(d.MAKTX, i.MATNR)              as ARTICLE_NAME : String(40),
      i.COLOR,
      i.SIZE_VAL,
      i.QTY_ORDERED,
      i.QTY_DELIVERED,
      i.UNIT_PRICE,
      round(i.QTY_ORDERED * i.UNIT_PRICE, 2)  as LINE_TOTAL   : Decimal(15,2)
};


// Sellout receipt enriched with store info
view SelloutSummary as
  select from SelloutHdr as h
  join Store as s on s.STORE_ID = h.STORE_ID
{
  key h.RECEIPT_ID,
      h.STORE_ID,
      s.STORE_NAME,
      s.CITY,
      s.REGION,
      s.COUNTRY_CODE,
      h.RECEIPT_DATE,
      h.PAYMENT_METHOD,
      h.GROSS_AMOUNT,
      h.DISCOUNT_AMOUNT,
      h.NET_AMOUNT,
      h.CURRENCY,
      h.CAMPAIGN_ID,
      h.CUSTOMER_ID,
      year(h.RECEIPT_DATE)  as YEAR  : Integer,
      month(h.RECEIPT_DATE) as MONTH : Integer
};


// Sellout item detail with article description
view SelloutItemDetail as
  select from SelloutItm as i
  left join MaterialDesc as d on d.MATNR = i.MATNR and d.MANDT = '100' and d.SPRAS = 'E'
{
  key i.RECEIPT_ID,
  key i.ITEM_NUM,
      i.MATNR,
      coalesce(d.MAKTX, i.MATNR) as ARTICLE_NAME : String(40),
      i.COLOR,
      i.SIZE_VAL,
      i.QTY,
      i.UNIT_PRICE,
      i.DISCOUNT_PCT,
      i.NET_AMOUNT
};


// Actual sellout vs sales target — monthly aggregation per store
@Aggregation.ApplySupported: {
  Transformations       : ['aggregate', 'groupby', 'filter'],
  GroupableProperties   : [STORE_ID, STORE_NAME, REGION, COUNTRY_CODE, YEAR, MONTH],
  AggregatableProperties: [
    { Property: ACTUAL_AMOUNT },
    { Property: TARGET_AMOUNT },
    { Property: ACHIEVEMENT_PCT }
  ]
}
@Analytics.entity: true
view ActualVsTarget as
  select from SalesTarget as t
  join Store as s on s.STORE_ID = t.STORE_ID
  cross join DemoState as _D
  left join SelloutHdr as h
    on h.STORE_ID = t.STORE_ID
   and year(h.RECEIPT_DATE)  = t.YEAR
   and month(h.RECEIPT_DATE) = t.MONTH
{
  key t.STORE_ID,
  key t.YEAR,
  key t.MONTH,
      s.STORE_NAME,
      s.CITY,
      s.REGION,
      s.COUNTRY_CODE,
      t.TARGET_AMOUNT,
      t.CURRENCY,
      case when t.STORE_ID = 'BR-SP-001' and _D.ACTIVE_SCENARIO = 'BAD'
           then round(coalesce(sum(h.NET_AMOUNT), 0) * 0.5, 2)
           else coalesce(sum(h.NET_AMOUNT), 0)
      end                                                         as ACTUAL_AMOUNT    : Decimal(15,2),
      case when t.TARGET_AMOUNT > 0
           then round(
             (case when t.STORE_ID = 'BR-SP-001' and _D.ACTIVE_SCENARIO = 'BAD'
                   then coalesce(sum(h.NET_AMOUNT), 0) * 0.5
                   else coalesce(sum(h.NET_AMOUNT), 0)
              end) / t.TARGET_AMOUNT * 100, 1)
           else 0
      end                                                         as ACHIEVEMENT_PCT  : Decimal(6,1)
}
group by t.STORE_ID, t.YEAR, t.MONTH, s.STORE_NAME, s.CITY, s.REGION, s.COUNTRY_CODE,
         t.TARGET_AMOUNT, t.CURRENCY, _D.ACTIVE_SCENARIO;
