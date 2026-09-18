import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const COLOR_A1 = '#ffc233'
const COLOR_A2 = '#0aa596'
const COLOR_REF = '#0f3d4c'

/** Parte una etiqueta larga en varias líneas (~22 caracteres) para el eje X. */
function TickMultilinea({ x, y, payload }) {
  const lineas = []
  let actual = ''
  for (const palabra of String(payload.value).split(' ')) {
    if ((actual + ' ' + palabra).trim().length > 22) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = (actual + ' ' + palabra).trim()
    }
  }
  if (actual) lineas.push(actual)
  return (
    <g transform={`translate(${x},${y})`}>
      {lineas.map((l, i) => (
        <text key={i} x={0} y={0} dy={14 + i * 13} textAnchor="middle" fontSize={11} fill="#626b75">
          {l}
        </text>
      ))}
    </g>
  )
}

// sin espacio antes del %: con "46 %" la etiqueta se parte en dos líneas dentro de la barra angosta
const fmtPct = (v) => (v == null ? '' : `${Math.round(v * 100)}%`)

/**
 * Barras agrupadas de QSQS: Aplicación 1, Aplicación 2 y una referencia (Colombia o Caldas),
 * con el % de acierto visible sobre cada barra.
 * `filas`: [{ etiqueta, a1, a2, refv }] — fracciones 0..1 (null = sin dato). OJO: la clave no puede
 * llamarse `ref` — Recharts vuelca cada dato como props de la barra y React lo toma como su `ref`.
 */
export default function EvolucionBarras({ filas, etiquetaRef = 'Colombia', alto = 320 }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={filas} margin={{ top: 22, right: 8, bottom: 4, left: 0 }} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
        <XAxis
          dataKey="etiqueta"
          interval={0}
          tickLine={false}
          axisLine={{ stroke: '#d9dee3' }}
          tick={<TickMultilinea />}
          height={64}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}`}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={28}
        />
        <Tooltip
          formatter={(v) => (v == null ? 's/d' : `${(v * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`)}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d9dee3' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {[
          { key: 'a1', name: 'Aplicación 1', fill: COLOR_A1 },
          { key: 'a2', name: 'Aplicación 2', fill: COLOR_A2 },
          { key: 'refv', name: `${etiquetaRef} (Aplic. 2)`, fill: COLOR_REF },
        ].map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.fill} radius={[3, 3, 0, 0]} maxBarSize={30}>
            <LabelList
              dataKey={s.key}
              position="top"
              formatter={fmtPct}
              style={{ fontSize: 10.5, fontWeight: 700, fill: '#20262e' }}
            />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
