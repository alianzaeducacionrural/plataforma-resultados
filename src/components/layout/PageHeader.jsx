import { Link } from 'react-router-dom'

export default function PageHeader({ titulo, crumbs, children }) {
  return (
    <div className="appbar">
      <div style={{ marginRight: 'auto', minWidth: 0 }}>
        {crumbs && (
          <div className="crumbs">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="sep"> / </span>}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </div>
        )}
        <div className="appbar-title">{titulo}</div>
      </div>
      {children}
    </div>
  )
}
