import React from 'react'
import type { StoreHealth } from '../api/odata'

interface StoreMatrixProps {
  stores: StoreHealth[]
}

const critColor = (c: number) => {
  if (c === 1) return { bg: '#fce8e8', color: '#bb0000' }
  if (c === 2) return { bg: '#fef0e0', color: '#e9730c' }
  return { bg: '#dcf5e7', color: '#107e3e' }
}

const StoreMatrix: React.FC<StoreMatrixProps> = ({ stores }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
    {stores.map(s => {
      const { bg, color } = critColor(s.scoreCriticality)
      const shortName = (s.nome || s.ID).replace(/^Loja\s+/i, '').split(' ').slice(0, 2).join(' ')
      return (
        <div key={s.ID} title={`${s.nome} — ${s.scoreSaude}`}
          style={{
            aspectRatio: '1',
            borderRadius: 6,
            background: bg,
            color,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            padding: 4,
            textAlign: 'center',
            cursor: 'default'
          }}>
          <span>{Number(s.scoreSaude).toFixed(0)}</span>
          <span style={{ fontSize: 9, opacity: 0.8, marginTop: 1 }}>{shortName}</span>
        </div>
      )
    })}
  </div>
)

export default StoreMatrix
