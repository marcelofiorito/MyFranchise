export interface StoreHealth {
  ID: string
  nome: string
  cidade: string
  regiao_code: string
  cluster_code: string
  scoreSaude: number
  compliancePct: number
  performancePct: number
  qtdAlertasAlta: number
  qtdAlertasMedia: number
  scoreCriticality: number
  criticalityText?: string
}

export interface NetworkSummary {
  total: number
  healthy: number
  warning: number
  critical: number
  avgScore: number
}

const BASE = '/franqueadora'

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`OData error: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function fetchStoreHealth(): Promise<StoreHealth[]> {
  const url = `${BASE}/Saude_Dashboard?$select=ID,nome,cidade,regiao_code,cluster_code,scoreSaude,compliancePct,performancePct,qtdAlertasAlta,qtdAlertasMedia,scoreCriticality&$orderby=scoreSaude asc&$top=50`
  const data = await fetchJSON(url) as { value: StoreHealth[] }
  return data.value ?? []
}

export function computeSummary(stores: StoreHealth[]): NetworkSummary {
  const total = stores.length
  const healthy = stores.filter(s => s.scoreCriticality === 3).length
  const warning = stores.filter(s => s.scoreCriticality === 2).length
  const critical = stores.filter(s => s.scoreCriticality === 1).length
  const avgScore = total > 0
    ? Math.round(stores.reduce((sum, s) => sum + Number(s.scoreSaude), 0) / total * 10) / 10
    : 0
  return { total, healthy, warning, critical, avgScore }
}

export function groupByRegion(stores: StoreHealth[]): Record<string, number> {
  const map: Record<string, number[]> = {}
  for (const s of stores) {
    const r = s.regiao_code || 'N/A'
    if (!map[r]) map[r] = []
    map[r].push(Number(s.scoreSaude))
  }
  const result: Record<string, number> = {}
  for (const [k, vals] of Object.entries(map)) {
    result[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
  }
  return result
}
