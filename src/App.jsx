import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar.jsx'
import Creditos from './components/Creditos.jsx'
import { Cargando, ErrorEstado, SinToken } from './components/Estado.jsx'
import { DatosProvider, FiltroProvider, useModelo } from './state/store.jsx'
import Panorama from './pages/Panorama.jsx'
import Instituciones from './pages/Instituciones.jsx'
import FichaInstitucion from './pages/FichaInstitucion.jsx'
import AnalisisArea from './pages/AnalisisArea.jsx'
import Comparador from './pages/Comparador.jsx'
import RutaMejoramiento from './pages/RutaMejoramiento.jsx'
import Historico from './pages/Historico.jsx'
import Documentos from './pages/Documentos.jsx'

export default function App() {
  return (
    <DatosProvider>
      <FiltroProvider>
        <Shell />
      </FiltroProvider>
    </DatosProvider>
  )
}

function Shell() {
  const { cargando, error, modelo, reintentar, progreso } = useModelo()

  if (error === 'sin-token') return <SinToken contexto="la plataforma" />
  if (cargando) return <Cargando progreso={progreso} />
  if (error) return <ErrorEstado mensaje={error} onReintentar={reintentar} />

  // Con token de institución el backend devuelve una sola → modo institución.
  const modo = modelo.instituciones.length <= 1 ? 'institucion' : 'maestro'
  const unica = modo === 'institucion' ? modelo.instituciones[0] : null

  return (
    <div className="shell">
      <Sidebar modo={modo} unica={unica} />
      <main className="main">
        <Routes>
          {modo === 'institucion' ? (
            <>
              <Route path="/instituciones/:dane" element={<FichaInstitucion />} />
              <Route path="*" element={<Navigate to={`/instituciones/${unica?.dane}`} replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Panorama />} />
              <Route path="/instituciones" element={<Instituciones />} />
              <Route path="/instituciones/:dane" element={<FichaInstitucion />} />
              <Route path="/areas" element={<AnalisisArea />} />
              <Route path="/comparador" element={<Comparador />} />
              <Route path="/ruta" element={<RutaMejoramiento />} />
              <Route path="/historico" element={<Historico />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/datos" element={<Navigate to="/documentos" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
        {/* En pantalla ancha los créditos van en el menú; este pie es para móvil y para el PDF */}
        <footer className="creditos-pie">
          <Creditos variante="clara" />
        </footer>
      </main>
    </div>
  )
}

export function useInstitucionParam() {
  const { modelo } = useModelo()
  const { dane } = useParams()
  return modelo?.instituciones.find((i) => i.dane === dane) || null
}
