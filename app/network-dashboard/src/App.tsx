import React, { useEffect, useState } from 'react'
import {
  fetchStoreHealth, computeSummary, groupByRegion,
  type StoreHealth, type NetworkSummary
} from './api/odata'
import KpiCard from './components/KpiCard'
import HealthBar from './components/HealthBar'
import CriticalityDonut from './components/CriticalityDonut'
import StoreMatrix from './components/StoreMatrix'
import AttentionTable from './components/AttentionTable'

const card: React.CSSProperties = {
  background: 'white',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
}

const chartTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#32363a',
  marginBottom: 4
}

const chartSubtitle: React.CSSProperties = {
  fontSize: 12,
  color: '#6a6d70',
  marginBottom: 16
}

export default function App() {
  const [stores, setStores] = useState<StoreHealth[]>([])
  const [summary, setSummary] = useState<NetworkSummary>({ total: 0, healthy: 0, warning: 0, critical: 0, avgScore: 0 })
  const [byRegion, setByRegion] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStoreHealth()
      .then(data => {
        setStores(data)
        setSummary(computeSummary(data))
        setByRegion(groupByRegion(data))
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#f5f6f7' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #d9d9d9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#009de0', color: 'white', fontSize: 18, fontWeight: 700, padding: '4px 10px', borderRadius: 4, letterSpacing: 1 }}>SAP</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#32363a' }}>Network Dashboard</div>
            <div style={{ fontSize: 13, color: '#6a6d70', marginTop: 2 }}>RunMyFranchise · React + ECharts · Live HANA Cloud</div>
          </div>
        </div>
        <span style={{ background: '#0070f2', color: 'white', fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
          {loading ? 'Loading…' : `${summary.total} stores`}
        </span>
      </div>

      {error && (
        <div style={{ background: '#fce8e8', border: '1px solid #bb0000', borderRadius: 8, padding: 16, marginBottom: 20, color: '#bb0000' }}>
          ⚠ Could not load data: {error}. Running in demo mode with static values.
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Avg Health Score" value={loading ? '…' : summary.avgScore} trend="Live · HANA Cloud" color="blue" />
        <KpiCard label="Healthy Stores" value={loading ? '…' : summary.healthy} trend={`of ${summary.total} total`} color="green" />
        <KpiCard label="Warning" value={loading ? '…' : summary.warning} trend="Score 45–70" color="orange" />
        <KpiCard label="Critical" value={loading ? '…' : summary.critical} trend="Score < 45" color="red" />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <div style={chartTitle}>Avg Health Score by Region</div>
          <div style={chartSubtitle}>Weighted average · live data</div>
          {loading ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6d70' }}>Loading…</div>
            : <HealthBar data={byRegion} />}
        </div>

        <div style={card}>
          <div style={chartTitle}>Network Health Distribution</div>
          <div style={chartSubtitle}>{summary.total} active stores</div>
          {loading ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6d70' }}>Loading…</div>
            : <CriticalityDonut summary={summary} />}
        </div>

        <div style={card}>
          <div style={chartTitle}>Store Health Matrix</div>
          <div style={chartSubtitle}>All stores · color = criticality · hover for details</div>
          {loading ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6d70' }}>Loading…</div>
            : <StoreMatrix stores={[...stores].sort((a, b) => b.scoreSaude - a.scoreSaude)} />}
        </div>

        <div style={card}>
          <div style={chartTitle}>Stores Requiring Attention</div>
          <div style={chartSubtitle}>Sorted by health score · lowest first</div>
          {loading ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6d70' }}>Loading…</div>
            : <AttentionTable stores={stores} limit={6} />}
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: '#6a6d70', textAlign: 'center' }}>
        RunMyFranchise · React 18 + TypeScript + Apache ECharts + UI5 Web Components · SAP BTP HANA Cloud
      </div>
    </div>
  )
}
