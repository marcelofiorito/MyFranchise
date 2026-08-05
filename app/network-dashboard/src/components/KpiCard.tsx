import React from 'react'

interface KpiCardProps {
  label: string
  value: string | number
  trend?: string
  color?: 'blue' | 'green' | 'orange' | 'red'
}

const colors = {
  blue:   { border: '#0070f2', value: '#0070f2', bg: 'white' },
  green:  { border: '#107e3e', value: '#107e3e', bg: 'white' },
  orange: { border: '#e9730c', value: '#e9730c', bg: 'white' },
  red:    { border: '#bb0000', value: '#bb0000', bg: 'white' },
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, trend, color = 'blue' }) => {
  const c = colors[color]
  return (
    <div style={{
      background: c.bg,
      borderRadius: 8,
      padding: '16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${c.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }}>
      <div style={{ fontSize: 11, color: '#6a6d70', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: c.value, lineHeight: 1.1 }}>
        {value}
      </div>
      {trend && (
        <div style={{ fontSize: 12, color: '#6a6d70' }}>{trend}</div>
      )}
    </div>
  )
}

export default KpiCard
