import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtNum } from '../../lib/format.js'

const ALTO = 280
// Alto útil aproximado de la zona de trazado (ALTO menos márgenes, eje X y leyenda);
// sirve para estimar cuántos píxeles separan dos series y decidir dónde va cada etiqueta.
const ALTO_UTIL = 200

/** Dominio ajustado a los datos, con aire arriba y abajo para que quepan las etiquetas. */
function dominioAjustado(series, anios) {
  const vals = series.flatMap((s) => anios.map((a) => s.data?.[a])).filter((v) => v != null)
  if (!vals.length) return ['auto', 'auto']
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pad = max === min ? 5 : Math.max((max - min) * 0.35, 3)
  return [Math.floor(min - pad), Math.ceil(max + pad)]
}

/**
 * Etiqueta con el valor de cada punto. Las series suelen quedar muy juntas
 * (institución / Caldas / Colombia), así que la etiqueta de la más alta va
 * arriba, la de la más baja abajo y la del medio arriba o al costado según
 * haya lugar — para que los números no se pisen entre sí.
 */
function crearEtiqueta({ serie, series, data, dominio, decimales }) {
  const pxPorUnidad = Array.isArray(dominio) && typeof dominio[0] === 'number' ? ALTO_UTIL / (dominio[1] - dominio[0]) : 4
  const yo = series.indexOf(serie)
  return function Etiqueta({ x, y, value, index }) {
    if (value == null || x == null || y == null) return null
    const fila = data[index] || {}
    const orden = series
      .map((s, i) => ({ v: fila[s.key], i }))
      .filter((o) => o.v != null)
      .sort((a, b) => b.v - a.v || a.i - b.i)
    const rango = orden.findIndex((o) => o.i === yo)
    const n = orden.length
    let pos = 'arriba'
    if (n > 1 && rango === n - 1) pos = 'abajo'
    else if (rango > 0 && (orden[rango - 1].v - value) * pxPorUnidad < 14) pos = 'lado'

    const esUltimo = index === data.length - 1
    const props =
      pos === 'abajo'
        ? { x, y: y + 17, textAnchor: 'middle' }
        : pos === 'lado'
          ? { x: esUltimo ? x - 9 : x + 9, y: y + 4, textAnchor: esUltimo ? 'end' : 'start' }
          : { x, y: y - 9, textAnchor: 'middle' }
    return (
      <text
        {...props}
        fontSize={11}
        fontWeight={700}
        fill={serie.color}
        stroke="#fff"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {fmtNum(value, decimales)}
      </text>
    )
  }
}

/**
 * Línea de tiempo genérica (Puntaje Global u otra métrica por año), con el
 * valor visible sobre cada punto.
 * `series`: [{ key, label, color, data: {anio: valor}, dashed? }]
 * `anios`: años a mostrar en el eje X (ya ordenados).
 * `domain`: opcional; por defecto se ajusta a los datos para que las etiquetas se lean.
 * `decimales`: decimales de las etiquetas (0 por defecto).
 */
export default function LineHistorico({ anios, series, domain, unidad = '', decimales = 0 }) {
  const data = anios.map((anio) => {
    const row = { anio }
    for (const s of series) row[s.key] = s.data?.[anio] ?? null
    return row
  })
  const dominio = domain || dominioAjustado(series, anios)
  return (
    <ResponsiveContainer width="100%" height={ALTO}>
      <LineChart data={data} margin={{ top: 18, right: 22, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
        <XAxis dataKey="anio" tickLine={false} axisLine={{ stroke: '#d9dee3' }} tick={{ fontSize: 11 }} />
        <YAxis domain={dominio} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={32} />
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
            label={crearEtiqueta({ serie: s, series, data, dominio, decimales })}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
