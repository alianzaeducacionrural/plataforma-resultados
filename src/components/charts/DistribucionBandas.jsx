import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { BANDAS_GLOBAL, bandaGlobal } from '../../data/saber11.js'

const COLOR = { alert: '#d1653c', warn: '#c99a2e', ok: '#1e8a82' }

export default function DistribucionBandas({ instituciones }) {
  const conteo = BANDAS_GLOBAL.map((b) => ({ ...b, n: 0 }))
  for (const i of instituciones) {
    if (i.global == null) continue
    const b = bandaGlobal(i.global)
    const item = conteo.find((c) => c.nombre === b.nombre)
    if (item) item.n++
  }
  const total = conteo.reduce((a, b) => a + b.n, 0)

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={conteo} margin={{ top: 16, right: 8, bottom: 4, left: 8 }}>
          <XAxis
            dataKey="nombre"
            tickFormatter={(v, i) => `${v}\n(${conteo[i].min}–${conteo[i].max})`}
            tickLine={false}
            axisLine={{ stroke: '#d9dee3' }}
            interval={0}
            tick={{ fontSize: 11 }}
          />
          <YAxis hide />
          <Bar dataKey="n" radius={[4, 4, 0, 0]} maxBarSize={90}>
            {conteo.map((c, i) => (
              <Cell key={i} fill={COLOR[c.clase]} />
            ))}
            <LabelList
              dataKey="n"
              position="top"
              formatter={(v) => (total ? `${v} · ${Math.round((v / total) * 100)}%` : v)}
              style={{ fill: '#20262e', fontSize: 12, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
