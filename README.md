# Plataforma de Resultados — Frontend

React + Vite. Consume la API del backend en Google Apps Script (repo del backend:
`Mejoramiento de desempeños` — no publicado, contiene el proyecto de Apps Script
y la migración de datos).

Publicado en GitHub Pages: https://alianzaeducacionrural.github.io/plataforma-resultados/

## Correr en local

```bash
npm install
cp .env.example .env.local   # completá VITE_TOKEN_MAESTRO
npm run dev
```

## Rutas

| Ruta | Vista | Token |
|---|---|---|
| `#/` | Panorama (todo el departamento) | maestro |
| `#/instituciones` | Listado de instituciones | maestro |
| `#/instituciones/:dane` | Ficha / reporte comparativo de una institución | maestro o de institución |
| `#/areas` | Análisis por área/competencia | maestro |
| `#/comparador` | Comparar instituciones o municipios | maestro |
| `#/ruta` | Ruta de mejoramiento | maestro |
| `#/historico` | Evolución entre aplicaciones | maestro |
| `#/datos` | Estado de los datos y exportables | maestro |

Con un token de institución (`#/instituciones/:dane?token=XXXX`), la app entra directo a la
ficha de esa institución y el resto del menú queda oculto.

## Estructura

```
src/
  api/client.js         fetch al doGet + caché en sesión + reintentos
  state/store.jsx        DatosProvider (carga el modelo una vez) + FiltroProvider (filtro global)
  lib/
    format.js             num/frac/pct/titleCase/fold — limpieza de tipos
    model.js              buildModel(): normaliza y arma el índice por institución
    hallazgos.js           "factores asociados" (lectura académica, no causal)
    exportar.js            CSV + impresión a PDF
  data/saber11.js          catálogo de competencias ICFES + bandas de puntaje
  components/              layout (Sidebar, FiltroGlobal, PageHeader), charts, ui
  pages/                   Panorama, Instituciones, FichaInstitucion, AnalisisArea,
                           Comparador, RutaMejoramiento, Historico, Datos
```

## Deploy

`git push` a `main` dispara `.github/workflows/deploy.yml` (build + publish a GitHub Pages).
`vite.config.js` usa `base: './'` (rutas relativas) así que funciona bajo el subpath del
proyecto sin configuración adicional. El proxy de `/gas` (`server.proxy` en `vite.config.js`)
solo aplica en `npm run dev`; en producción el navegador pega directo a `VITE_API_URL`.
