import React from 'react'
import type { StoreHealth } from '../api/odata'

interface AttentionTableProps {
  stores: StoreHealth[]
  limit?: number
}

const scoreBadge = (score: number, crit: number) => {
  const s = Number(score).toFixed(2)
  if (crit === 1) return <span style={badge('#fce8e8','#bb0000')}>{s}</span>
  if (crit === 2) return <span style={badge('#fef0e0','#e9730c')}>{s}</span>
  return <span style={badge('#dcf5e7','#107e3e')}>{s}</span>
}

const badge = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 10,
  fontSize: 11, fontWeight: 700, background: bg, color
})

const regionTag = (r: string) => (
  <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: '#e8f0fe', color: '#0070f2' }}>{r}</span>
)

const AttentionTable: React.FC<AttentionTableProps> = ({ stores, limit = 6 }) => {
  const rows = stores.slice(0, limit)
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          {['Store', 'Region', 'Score', 'Compliance'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '8px 10px', background: '#f5f6f7', color: '#6a6d70', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e5e5e5' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(s => (
          <tr key={s.ID}>
            <td style={{ padding: '9px 10px', borderBottom: '1px solid #f0f0f0' }}>
              <strong>{(s.nome || s.ID).replace(/^Loja\s+/i, '')}</strong>
            </td>
            <td style={{ padding: '9px 10px', borderBottom: '1px solid #f0f0f0' }}>
              {regionTag(s.regiao_code)}
            </td>
            <td style={{ padding: '9px 10px', borderBottom: '1px solid #f0f0f0' }}>
              {scoreBadge(s.scoreSaude, s.scoreCriticality)}
            </td>
            <td style={{ padding: '9px 10px', borderBottom: '1px solid #f0f0f0' }}>
              {Number(s.compliancePct).toFixed(0)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default AttentionTable
