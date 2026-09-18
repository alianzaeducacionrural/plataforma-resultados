import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AREAS_S11 } from '../../lib/model.js'
import { AREAS_CORTO as CORTO } from '../../data/saber11.js'
import { PALETA_INSTITUCIONES as PALETA } from '../../lib/paleta.js'


/** Barras agrupadas: eje X = prueba de Saber 11, una serie por institución, con el valor sobre cada barra. */
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
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
        <XAxis dataKey="area" tickLine={false} axisLine={{ stroke: '#d9dee3' }} tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip
          formatter={(v, name) => [v == null ? 's/d' : v.toFixed(1), instituciones.find((i) => i.dane === name)?.nombre || name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d9dee3' }}
        />
        <Legend
          content={() => (
            <div className="evo-leyenda">
              {instituciones.map((inst, i) => (
                <span key={inst.dane} className="evo-chip">
                  <i style={{ background: PALETA[i % PALETA.length] }} />
                  {inst.nombre}
                </span>
              ))}
            </div>
          )}
        />
        {instituciones.map((inst, i) => (
          <Bar key={inst.dane} dataKey={inst.dane} fill={PALETA[i % PALETA.length]} radius={[3, 3, 0, 0]} maxBarSize={34}>
            <LabelList
              dataKey={inst.dane}
              position="top"
              formatter={(v) => (v == null ? '' : Math.round(v))}
              style={{ fontSize: 11, fontWeight: 700, fill: '#20262e' }}
            />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
