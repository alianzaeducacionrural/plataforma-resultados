import comiteBlanco from '../assets/logos/comite-blanco.png'
import comiteColor from '../assets/logos/comite-color.png'
import sedBlanco from '../assets/logos/sed-blanco.png'
import sedColor from '../assets/logos/sed-color.png'

/**
 * Créditos con los logos de las dos instituciones. Cada logo viene en dos versiones y se elige
 * la que se lee sobre el fondo: `oscura` (menú lateral: texto blanco) o `clara` (pie de página
 * en móvil y en el PDF: colores institucionales). El logo de la SED ya lleva "Gobierno de
 * Caldas", así que no hace falta un logo aparte de la Gobernación.
 */
export default function Creditos({ variante = 'oscura' }) {
  const clara = variante === 'clara'
  return (
    <div className={'creditos ' + variante}>
      <div className="creditos-label">Creado por</div>
      <div className="creditos-item comite">
        <img src={clara ? comiteColor : comiteBlanco} alt="Comité de Cafeteros de Caldas" />
        <span>Área de Educación</span>
      </div>
      <div className="creditos-item sed">
        <img src={clara ? sedColor : sedBlanco} alt="Gobierno de Caldas — Secretaría de Educación" />
        <span>Calidad Educativa</span>
      </div>
    </div>
  )
}
