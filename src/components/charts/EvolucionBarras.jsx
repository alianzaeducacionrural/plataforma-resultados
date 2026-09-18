import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const COLOR_A1 = '#ffc233'
const COLOR_A2 = '#0aa596'

/** Parte un texto en líneas de ~22 caracteres para el eje X. */
function partir(texto) {
  const lineas = []
  let actual = ''
  for (const palabra of String(texto).split(' ')) {
    if ((actual + ' ' + palabra).trim().length > 22) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = (actual + ' ' + palabra).trim()
    }
  }
  if (actual) lineas.push(actual)
  return lineas
}

/** Separa la etiqueta en encabezado (antes del salto de línea) y líneas de detalle. */
function dividir(etiqueta) {
  const [cabecera, ...resto] = String(etiqueta).split('\n')
  const detalle = resto.join(' ')
  return detalle ? { cabecera, lineas: partir(detalle) } : { cabecera: null, lineas: partir(cabecera) }
}

/** Cambio de la Aplicación 1 a la 2 (fracción 0..1 → texto en puntos porcentuales). */
function textoCambio(d) {
  const pts = Math.abs(d * 100).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (Math.abs(d * 100) < 0.05) return '● sin cambio'
  return d > 0 ? `▲ +${pts} pts` : `▼ −${pts} pts`
}
const TONO_CAMBIO = {
  sube: { fondo: '#dcf5e7', texto: '#0b7a45' },
  baja: { fondo: '#fde9e3', texto: '#c93a14' },
  igual: { fondo: '#e4eeec', texto: '#52656c' },
}

/**
 * Etiqueta del eje X: encabezado en negrita (p. ej. la prueba), detalle en varias líneas (p. ej. la
 * competencia) y, debajo, una pastilla con el cambio entre la Aplicación 1 y la 2.
 */
function TickCambio({ x, y, payload, filas }) {
  const fila = filas[payload.index]
  const { cabecera, lineas } = dividir(payload.value)
  const cambio = fila && fila.a1 != null && fila.a2 != null ? fila.a2 - fila.a1 : null
  const nLineas = lineas.length + (cabecera ? 1 : 0)
  let pastilla = null
  if (cambio != null) {
    const tono = Math.abs(cambio * 100) < 0.05 ? TONO_CAMBIO.igual : cambio > 0 ? TONO_CAMBIO.sube : TONO_CAMBIO.baja
    const txt = textoCambio(cambio)
    const ancho = txt.length * 6.4 + 16
    pastilla = (
      <g transform={`translate(0,${6 + nLineas * 13 + 6})`}>
        <rect x={-ancho / 2} y={0} width={ancho} height={19} rx={9.5} fill={tono.fondo} />
        <text x={0} y={13} textAnchor="middle" fontSize={11} fontWeight={700} fill={tono.texto}>
          {txt}
        </text>
      </g>
    )
  }
  return (
    <g transform={`translate(${x},${y})`}>
      {cabecera && (
        <text x={0} y={0} dy={14} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="#0f3d4c">
          {cabecera}
        </text>
      )}
      {lineas.map((l, i) => (
        <text key={i} x={0} y={0} dy={14 + (i + (cabecera ? 1 : 0)) * 13} textAnchor="middle" fontSize={11} fill="#626b75">
          {l}
        </text>
      ))}
      {pastilla}
    </g>
  )
}

// sin espacio antes del %: con "46 %" la etiqueta se parte en dos líneas dentro de la barra angosta
const fmtPct = (v) => (v == null ? '' : `${Math.round(v * 100)}%`)

/**
 * Barras agrupadas de QSQS: Aplicación 1 y Aplicación 2 con el % de acierto sobre cada barra y, bajo
 * cada grupo, una pastilla con el cambio entre las dos aplicaciones (en puntos porcentuales).
 * `filas`: [{ etiqueta, a1, a2 }] — fracciones 0..1 (null = sin dato). La etiqueta puede llevar un
 * salto de línea: lo de antes va como encabezado.
 */
export default function EvolucionBarras({ filas, alto = 320 }) {
  const maxLineas = Math.max(...filas.map((f) => { const d = dividir(f.etiqueta); return d.lineas.length + (d.cabecera ? 1 : 0) }), 1)
  const altoEje = 14 + maxLineas * 13 + 36
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={filas} margin={{ top: 22, right: 8, bottom: 4, left: 0 }} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
        <XAxis
          dataKey="etiqueta"
          interval={0}
          tickLine={false}
          axisLine={{ stroke: '#d9dee3' }}
          tick={(p) => <TickCambio {...p} filas={filas} />}
          height={altoEje}
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
          labelFormatter={(l) => String(l).replace('\n', ' · ')}
          formatter={(v) => (v == null ? 's/d' : `${(v * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`)}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d9dee3' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {[
          { key: 'a1', name: 'Aplicación 1', fill: COLOR_A1 },
          { key: 'a2', name: 'Aplicación 2', fill: COLOR_A2 },
        ].map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.fill} radius={[3, 3, 0, 0]} maxBarSize={34}>
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
