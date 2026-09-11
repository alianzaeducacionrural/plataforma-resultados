import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AREAS_S11 } from '../../lib/model.js'
import { AREAS_CORTO as CORTO } from '../../data/saber11.js'

const PALETA = ['#2b3440', '#1e8a82', '#c99a2e', '#d1653c', '#6a8caf', '#8a6aaf']

/** Barras agrupadas: eje X = área, una serie por institución. */
export default function BarrasComparativas({ instituciones }) {
  const data = AREAS_S11.map((area) => {
    const row = { area: CORTO[area] || area }
    for (const inst of instituciones) {
      const a = inst.areasS11?.find((x) => x.area === area)
      row[inst.dane] = a?.ee ?? null
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
        <XAxis dataKey="area" tickLine={false} axisLine={{ stroke: '#d9dee3' }} tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip
          formatter={(v, name) => [v == null ? 's/d' : v.toFixed(1), instituciones.find((i) => i.dane === name)?.nombre || name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d9dee3' }}
        />
        <Legend
          formatter={(value) => instituciones.find((i) => i.dane === value)?.nombre || value}
          wrapperStyle={{ fontSize: 11 }}
        />
        {instituciones.map((inst, i) => (
          <Bar key={inst.dane} dataKey={inst.dane} fill={PALETA[i % PALETA.length]} radius={[3, 3, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
