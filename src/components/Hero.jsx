/**
 * Portada de una página: titular cálido, una lectura en palabras (`children`) y, debajo, las
 * "buenas noticias" — cifras reales de lo que va bien, para que el tablero no sea solo alertas.
 * `logros`: [{ num, texto }]; los que no tienen número (0 o sin dato) se omiten al armarlos.
 */
export default function Hero({ kicker, titulo, children, logros = [] }) {
  return (
    <section className="hero">
      <div className="hero-texto">
        {kicker && <div className="hero-kicker">{kicker}</div>}
        <h2>{titulo}</h2>
        <p>{children}</p>
      </div>
      {logros.length > 0 && (
        <div className="hero-logros">
          {logros.map((l) => (
            <div key={l.texto} className="logro">
              <span className="logro-num">{l.num}</span>
              <span className="logro-txt">{l.texto}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
