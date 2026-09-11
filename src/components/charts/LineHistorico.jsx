import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Línea de tiempo genérica (Puntaje Global u otra métrica por año).
 * `series`: [{ key, label, color, data: {anio: valor}, dashed? }]
 * `anios`: años a mostrar en el eje X (ya ordenados).
 */
export default function LineHistorico({ anios, series, domain, unidad = '' }) {
  const data = anios.map((anio) => {
    const row = { anio }
    for (const s of series) row[s.key] = s.data?.[anio] ?? null
    return row
  })
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
        <XAxis dataKey="anio" tickLine={false} axisLine={{ stroke: '#d9dee3' }} tick={{ fontSize: 11 }} />
        <YAxis
          domain={domain || ['auto', 'auto']}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={32}
        />
        <Tooltip
          formatter={(v) => (v == null ? 's/d' : `${v}${unidad}`)}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d9dee3' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={s.dashed ? 1.5 : 2.5}
            strokeDasharray={s.dashed ? '4 3' : undefined}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
