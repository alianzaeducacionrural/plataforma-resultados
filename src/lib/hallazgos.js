// "Factores asociados" en versión académica (sin dato socioemocional — no lo
// tenemos). Observaciones simples y explícitamente no causales, a partir de
// los mismos datos que ya se ven en la ficha.

import { fmtNum, pct } from './format.js'
import { AREAS_S11, media } from './model.js'

export function hallazgosInstitucion(inst, pares) {
  const out = []
  const areas = inst.areasS11 || []
  const conDato = areas.filter((a) => a.ee != null && a.gapCol != null)

  if (conDato.length) {
    const peor = [...conDato].sort((a, b) => a.gapCol - b.gapCol)[0]
    const mejor = [...conDato].sort((a, b) => b.gapCol - a.gapCol)[0]
    out.push({
      icono: '📌',
      titulo: `Mayor brecha: ${peor.area}`,
      texto: `${fmtNum(peor.ee, 1)} pts, ${fmtNum(Math.abs(peor.gapCol), 1)} por debajo de Colombia. Es el foco más claro de mejoramiento.`,
    })
    if (mejor.area !== peor.area) {
      out.push({
        icono: '✅',
        titulo: `Punto más fuerte: ${mejor.area}`,
        texto:
          mejor.gapCol >= 0
            ? `${fmtNum(mejor.ee, 1)} pts, ${fmtNum(mejor.gapCol, 1)} por encima de Colombia.`
            : `${fmtNum(mejor.ee, 1)} pts — la más cercana a Colombia (${fmtNum(Math.abs(mejor.gapCol), 1)} por debajo).`,
      })
    }
  }

  // participación QSQS vs desempeño Saber 11
  if (inst.participacionQsqs != null && inst.global != null && pares.length >= 5) {
    const promGlobalPares = media(pares.map((p) => p.global))
    const promPartPares = media(pares.map((p) => p.participacionQsqs))
    if (promGlobalPares != null && promPartPares != null) {
      const altaPart = inst.participacionQsqs >= promPartPares
      const altoGlobal = inst.global >= promGlobalPares
      if (altaPart && !altoGlobal) {
        out.push({
          icono: '🔎',
          titulo: 'Participación QSQS alta, puntaje Saber 11 por debajo del grupo',
          texto: `Participación ${pct(inst.participacionQsqs)} (grupo: ${pct(promPartPares)}) pero puntaje global ${fmtNum(inst.global)} (grupo: ${fmtNum(promGlobalPares)}). Puede valer la pena revisar cómo se está usando ese compromiso.`,
        })
      } else if (!altaPart && altoGlobal) {
        out.push({
          icono: '🔎',
          titulo: 'Buen puntaje Saber 11 con participación QSQS baja',
          texto: `Participación ${pct(inst.participacionQsqs)} (grupo: ${pct(promPartPares)}) con puntaje global ${fmtNum(inst.global)} por encima del grupo (${fmtNum(promGlobalPares)}). Subir la participación en QSQS podría dar más señal temprana.`,
        })
      }
    }
  }

  // consistencia entre pruebas
  if (conDato.length === AREAS_S11.length) {
    const gaps = conDato.map((a) => a.gapCol)
    const dispersión = Math.max(...gaps) - Math.min(...gaps)
    out.push({
      icono: dispersión > 15 ? '⚠️' : 'ℹ️',
      titulo: dispersión > 15 ? 'Desempeño desigual entre pruebas' : 'Desempeño parejo entre pruebas',
      texto:
        dispersión > 15
          ? `La diferencia entre la mejor y la peor prueba es de ${fmtNum(dispersión, 1)} pts — conviene un plan por prueba, no uno solo para toda la institución.`
          : `Las 5 pruebas están relativamente parejas (diferencia de ${fmtNum(dispersión, 1)} pts) — el foco puede ser transversal.`,
    })
  }

  out.push({
    icono: 'ℹ️',
    titulo: 'Lectura no causal',
    texto:
      'Estas observaciones son descriptivas, a partir de promedios y comparaciones. No implican causalidad ni reemplazan el criterio del equipo docente.',
  })

  return out
}
