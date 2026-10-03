import { useEffect, useState } from 'react'
import { reportesApi } from '../../api/client'
import { BarList, ColumnChart } from '../../components/Charts'
import Icon from '../../components/Icon'
import ProductoImagen from '../../components/ProductoImagen'
import SkuCode from '../../components/SkuCode'
import { hoyLima, METODOS_PAGO, money, plural } from '../../utils/format'

const RANGOS = [
  { id: 'hoy', label: 'Hoy', desde: () => hoyLima() },
  { id: '7', label: '7 días', desde: () => hoyLima(-6) },
  { id: '30', label: '30 días', desde: () => hoyLima(-29) },
  { id: '90', label: '90 días', desde: () => hoyLima(-89) },
]

export default function Reportes() {
  const [desde, setDesde] = useState(hoyLima(-29))
  const [hasta, setHasta] = useState(hoyLima())
  const [rep, setRep] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError('')
    reportesApi.resumen({ desde, hasta })
      .then(setRep)
      .catch((err) => setError(err.detail))
      .finally(() => setLoading(false))
  }, [desde, hasta])

  const rangoActivo = RANGOS.find((r) => r.desde() === desde && hasta === hoyLima())?.id
  const ind = rep?.indicadores

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes de ventas</h1>
          <p className="page-subtitle">Indicadores calculados sobre ventas completadas (hora de Lima).</p>
        </div>
        <button className="btn btn-outline no-print" onClick={() => window.print()}><Icon name="printer" /> Imprimir</button>
      </div>

      <div className="filter-bar no-print">
        <div className="segmented">
          {RANGOS.map((r) => (
            <button key={r.id} type="button" className={rangoActivo === r.id ? 'active' : ''}
              onClick={() => { setDesde(r.desde()); setHasta(hoyLima()) }}>{r.label}</button>
          ))}
        </div>
        <label className="inline-label">Desde <input type="date" className="form-control" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="inline-label">Hasta <input type="date" className="form-control" value={hasta} min={desde} max={hoyLima()} onChange={(e) => setHasta(e.target.value)} /></label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && !rep ? <div className="loading-page"><span className="spinner spinner-dark" /> Generando reporte…</div> : rep && (
        <div className={loading ? 'is-loading' : ''}>
          <div className="stats-grid">
            <div className="stat-card">
              <p className="stat-label">Total vendido</p>
              <p className="stat-value">{money(ind.total_vendido)}</p>
              <p className="stat-hint">Base {money(ind.base_imponible)} + IGV {money(ind.igv)}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Ventas completadas</p>
              <p className="stat-value">{ind.ventas_completadas}</p>
              <p className="stat-hint">{plural(ind.unidades_vendidas, 'unidad vendida', 'unidades vendidas')}</p>
            </div>
            <div className="stat-card stat-black">
              <p className="stat-label">Ticket promedio</p>
              <p className="stat-value">{money(ind.ticket_promedio)}</p>
              <p className="stat-hint">Por venta completada</p>
            </div>
            <div className="stat-card stat-black">
              <p className="stat-label">Anulaciones</p>
              <p className="stat-value">{ind.ventas_anuladas}</p>
              <p className="stat-hint">{money(ind.monto_anulado)} anulados</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Ventas por día</h3></div>
            <ColumnChart datos={rep.por_dia} />
          </div>

          <div className="grid-3">
            <div className="card">
              <div className="card-header"><h3 className="card-title">Por familia</h3></div>
              <BarList datos={rep.por_familia} etiqueta="familia" detalle={(d) => plural(d.unidades, 'unidad', 'unidades')} />
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Por método de pago</h3></div>
              <BarList datos={rep.por_metodo.map((m) => ({ ...m, metodo: METODOS_PAGO[m.metodo] || m.metodo }))}
                etiqueta="metodo" detalle={(d) => plural(d.ventas, 'venta')} />
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Por vendedor</h3></div>
              <BarList datos={rep.por_vendedor} etiqueta="nombre" detalle={(d) => plural(d.ventas, 'venta')} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Top 10 productos más vendidos</h3></div>
            {rep.top_productos.length === 0 ? <div className="empty-state">Sin ventas en el rango.</div> : (
              <table className="data-table compact">
                <thead><tr><th>#</th><th /><th>SKU</th><th>Producto</th><th className="num">Unidades</th><th className="num">Importe</th></tr></thead>
                <tbody>
                  {rep.top_productos.map((p, i) => (
                    <tr key={p.producto_id}>
                      <td><strong>{i + 1}</strong></td>
                      <td><ProductoImagen producto={p} size="xs" /></td>
                      <td><SkuCode sku={p.sku} size="sm" /></td>
                      <td>{p.nombre}</td>
                      <td className="num">{p.unidades}</td>
                      <td className="num"><strong>{money(p.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  )
}
