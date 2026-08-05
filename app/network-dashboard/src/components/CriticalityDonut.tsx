import React from 'react'
import ReactECharts from 'echarts-for-react'
import type { NetworkSummary } from '../api/odata'

interface CriticalityDonutProps {
  summary: NetworkSummary
}

const CriticalityDonut: React.FC<CriticalityDonutProps> = ({ summary }) => {
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: false } },
      data: [
        { value: summary.critical, name: 'Critical',  itemStyle: { color: '#bb0000' } },
        { value: summary.warning,  name: 'Warning',   itemStyle: { color: '#e9730c' } },
        { value: summary.healthy,  name: 'Healthy',   itemStyle: { color: '#107e3e' } },
      ].filter(d => d.value > 0)
    }],
    graphic: [{
      type: 'text',
      left: '33%',
      top: '42%',
      style: { text: String(summary.total), fontSize: 28, fontWeight: 700, fill: '#32363a', textAlign: 'center' }
    }, {
      type: 'text',
      left: '33%',
      top: '56%',
      style: { text: 'stores', fontSize: 11, fill: '#6a6d70', textAlign: 'center' }
    }]
  }

  const legendItems = [
    { color: '#107e3e', count: summary.healthy,  label: `Healthy (>70)` },
    { color: '#e9730c', count: summary.warning,  label: `Warning (45–70)` },
    { color: '#bb0000', count: summary.critical, label: `Critical (<45)` },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ReactECharts option={option} style={{ height: 180, width: 200, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {legendItems.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: '#32363a' }}>{item.count}</span>
            <span style={{ color: '#6a6d70' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CriticalityDonut
