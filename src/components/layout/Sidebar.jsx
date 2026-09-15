import { NavLink } from 'react-router-dom'

const I = {
  panorama: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z" strokeLinejoin="round" />
    </svg>
  ),
  inst: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" strokeLinecap="round" />
    </svg>
  ),
  areas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
    </svg>
  ),
  comparador: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3v18M15 3v18M4 8h5M15 8h5M4 16h5M15 16h5" strokeLinecap="round" />
    </svg>
  ),
  ruta: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3v12M6 21a3 3 0 100-6 3 3 0 000 6zM18 9a3 3 0 100-6 3 3 0 000 6zm0 0v6a3 3 0 01-3 3H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  historico: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18M7 15l4-4 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  datos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" strokeLinecap="round" />
    </svg>
  ),
  documentos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" strokeLinejoin="round" />
      <path d="M14 3v6h6M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  ),
}

const NAV = [
  { to: '/', end: true, icon: I.panorama, label: 'Panorama' },
  { to: '/instituciones', icon: I.inst, label: 'Instituciones' },
  { to: '/areas', icon: I.areas, label: 'Análisis por área' },
  { to: '/comparador', icon: I.comparador, label: 'Comparador' },
  { to: '/ruta', icon: I.ruta, label: 'Ruta de mejoramiento' },
  { to: '/historico', icon: I.historico, label: 'Histórico' },
  { to: '/datos', icon: I.datos, label: 'Datos' },
  { to: '/documentos', icon: I.documentos, label: 'Documentos' },
]

export default function Sidebar({ modo, unica }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2l8 3v6c0 5-3.4 8.7-8 11-4.6-2.3-8-6-8-11V5l8-3z" fill="#1E8A82" />
          <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="sidebar-brand-title">Plataforma de Resultados</div>
          <div className="sidebar-brand-sub">QSQS + Saber 11 · Caldas</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {modo === 'institucion' ? (
          <NavLink
            to={`/instituciones/${unica?.dane}`}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            {I.inst}
            Mi institución
          </NavLink>
        ) : (
          NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              {n.icon}
              {n.label}
            </NavLink>
          ))
        )}
      </nav>

      <div className="sidebar-foot">
        {modo === 'institucion' && 'Solo ves los datos de tu institución.'}
        <div className="sidebar-credito">
          <div className="sidebar-credito-label">Creado por</div>
          <div>Comité de Cafeteros de Caldas · Área de Educación</div>
          <div>SED Caldas · Calidad Educativa</div>
        </div>
      </div>
    </aside>
  )
}
