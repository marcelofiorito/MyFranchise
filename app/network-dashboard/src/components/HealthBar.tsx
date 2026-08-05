import React from 'react'
import ReactECharts from 'echarts-for-react'

interface HealthBarProps {
  data: Record<string, number>
}

const REGION_COLORS: Record<string, string> = {
  SE: '#0070f2',
  CO: '#00b4d4',
  N:  '#6c3483',
  NE: '#107e3e',
  S:  '#e9730c',
}

const HealthBar: React.FC<HealthBarProps> = ({ data }) => {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1])
  const regions = sorted.map(([r]) => r)
  const scores  = sorted.map(([, s]) => s)
  const barColors = regions.map(r => REGION_COLORS[r] ?? '#0070f2')

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown[]) => {
        const p = params[0] as { name: string; value: number }
        return `<b>${p.name}</b><br/>Avg Score: <b>${p.value}</b>`
      }
    },
    grid: { left: 40, right: 20, top: 10, bottom: 20 },
    xAxis: { type: 'value', max: 100, axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    yAxis: { type: 'category', data: regions, axisLabel: { fontSize: 12, color: '#6a6d70' } },
    series: [{
      type: 'bar',
      data: scores.map((v, i) => ({ value: v, itemStyle: { color: barColors[i], borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: '{c}', fontSize: 11, fontWeight: 600, color: '#32363a' },
      barMaxWidth: 28
    }]
  }

  return <ReactECharts option={option} style={{ height: 200 }} />
}

export default HealthBar
