import { money } from '../utils/format'

/** Columnas verticales simples en SVG (ventas por día). */
export function ColumnChart({ datos, valor = 'total', etiqueta = 'fecha', alto = 200, formato = money }) {
  if (!datos?.length) return <div className="empty-state">Sin datos en el rango.</div>
  const max = Math.max(...datos.map((d) => d[valor]), 1)
  const ancho = 100 / datos.length
  const cadaN = Math.ceil(datos.length / 10)
  return (
    <div className="column-chart">
      <svg viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" role="img" aria-label="Gráfico de ventas por día">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2="100" y1={alto * (1 - f)} y2={alto * (1 - f)} className="chart-grid" vectorEffect="non-scaling-stroke" />
        ))}
        {datos.map((d, i) => {
          const h = (d[valor] / max) * (alto - 4)
          return (
            <rect key={d[etiqueta]} x={i * ancho + ancho * 0.15} y={alto - h} width={ancho * 0.7} height={Math.max(h, d[valor] ? 1 : 0)}
              className="chart-bar" rx="0.4">
              <title>{`${d[etiqueta]}: ${formato(d[valor])}${d.ventas !== undefined ? ` (${d.ventas} ventas)` : ''}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="column-chart-labels">
        {datos.map((d, i) => (
          <span key={d[etiqueta]} style={{ width: `${ancho}%` }}>
            {i % cadaN === 0 ? d[etiqueta].slice(5).split('-').reverse().join('/') : ''}
          </span>
        ))}
      </div>
      <div className="chart-max">Máx. {formato(max)}</div>
    </div>
  )
}

/** Barras horizontales con etiqueta y valor. */
export function BarList({ datos, etiqueta, valor = 'total', formato = money, detalle }) {
  if (!datos?.length) return <div className="empty-state">Sin datos en el rango.</div>
  const max = Math.max(...datos.map((d) => d[valor]), 1)
  return (
    <div className="bar-list">
      {datos.map((d, i) => (
        <div className="bar-row" key={`${d[etiqueta]}-${i}`}>
          <div className="bar-row-head">
            <span className="bar-label">{d[etiqueta]}</span>
            <span className="bar-value">{formato(d[valor])}</span>
          </div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d[valor] / max) * 100}%` }} /></div>
          {detalle && <div className="bar-detail">{detalle(d)}</div>}
        </div>
      ))}
    </div>
  )
}
