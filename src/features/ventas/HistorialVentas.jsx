import { useEffect, useState } from 'react'
import { ventasApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Pagination from '../../components/Pagination'
import { fechaHora, hoyLima, METODOS_PAGO, money } from '../../utils/format'
import ComprobanteModal from './ComprobanteModal'

const FILTROS = { q: '', desde: '', hasta: '', estado: '', metodo_pago: '', usuario_id: '', page: 1 }

/** Historial de ventas con filtros y paginación. La acción "Anular" solo se
 * muestra si el rol activo tiene el permiso ventas.anular (Supervisor de
 * Ventas o Administrador) y exige un motivo. */
export default function HistorialVentas({ puedeAnular = false }) {
  const fb = useFeedback()
  const [filtros, setFiltros] = useState(FILTROS)
  const [data, setData] = useState({ ventas: [], total: 0, pages: 1, page: 1 })
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)

  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v, page: k === 'page' ? v : 1 }))

  const cargar = async () => {
    setLoading(true)
    try { setData(await ventasApi.listar(filtros)) } catch (err) { fb.error(err.detail) } finally { setLoading(false) }
  }
  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
  }, [filtros]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { ventasApi.vendedores().then((r) => setVendedores(r.vendedores)).catch(() => {}) }, [])

  const verDetalle = async (id) => {
    try { setDetalle((await ventasApi.obtener(id)).venta) } catch (err) { fb.error(err.detail) }
  }

  const anular = async (v) => {
    const motivo = await fb.confirmar({
      titulo: `Anular venta ${v.codigo}`,
      mensaje: `Se anulará la venta por ${money(v.total)} y se devolverán las unidades al stock. Esta acción queda registrada a tu nombre.`,
      textoConfirmar: 'Anular venta', peligro: true,
      pedirMotivo: true, etiquetaMotivo: 'Motivo de la anulación', minMotivo: 10,
    })
    if (!motivo) return
    try {
      const r = await ventasApi.anular(v.id, motivo)
      fb.ok(`Venta ${v.codigo} anulada. Stock devuelto.`)
      if (detalle?.id === v.id) setDetalle(r.venta)
      cargar()
    } catch (err) {
      fb.error(err.detail || 'No fue posible anular.')
    }
  }

  const hayFiltros = Object.entries(filtros).some(([k, v]) => k !== 'page' && v)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de ventas</h1>
          <p className="page-subtitle">Consulta, reimprime y {puedeAnular ? 'anula' : 'revisa'} ventas registradas.</p>
        </div>
        <div className="segmented">
          <button type="button" onClick={() => setFiltros({ ...FILTROS, desde: hoyLima(), hasta: hoyLima() })}>Hoy</button>
          <button type="button" onClick={() => setFiltros({ ...FILTROS, desde: hoyLima(-6), hasta: hoyLima() })}>7 días</button>
          <button type="button" onClick={() => setFiltros(FILTROS)}>Todo</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input className="form-control" placeholder="Código de venta o cliente…" value={filtros.q} onChange={(e) => set('q', e.target.value)} />
        </div>
        <label className="inline-label">Desde <input type="date" className="form-control" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => set('desde', e.target.value)} /></label>
        <label className="inline-label">Hasta <input type="date" className="form-control" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => set('hasta', e.target.value)} /></label>
        <select className="form-control" value={filtros.estado} onChange={(e) => set('estado', e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="completada">Completadas</option>
          <option value="anulada">Anuladas</option>
        </select>
        <select className="form-control" value={filtros.metodo_pago} onChange={(e) => set('metodo_pago', e.target.value)}>
          <option value="">Todos los pagos</option>
          {Object.entries(METODOS_PAGO).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        {vendedores.length > 1 && (
          <select className="form-control" value={filtros.usuario_id} onChange={(e) => set('usuario_id', e.target.value)}>
            <option value="">Todos los vendedores</option>
            {vendedores.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        )}
        {hayFiltros && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFiltros(FILTROS)}>Limpiar</button>}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Atendido por</th>
              <th>Cliente</th>
              <th>Pago</th>
              <th className="num">Ítems</th>
              <th className="num">Total</th>
              <th>Estado</th>
              <th className="actions-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="empty-state">Cargando…</td></tr>
            ) : data.ventas.length === 0 ? (
              <tr><td colSpan="9" className="empty-state">{hayFiltros ? 'Ninguna venta coincide con los filtros.' : 'Aún no hay ventas registradas.'}</td></tr>
            ) : data.ventas.map((v) => (
              <tr key={v.id} className={v.estado === 'anulada' ? 'row-muted' : ''}>
                <td className="mono"><strong>{v.codigo}</strong></td>
                <td className="nowrap">{fechaHora(v.fecha)}</td>
                <td>{v.usuario_nombre}<div className="cell-sub">{v.rol}</div></td>
                <td>{v.cliente_nombre || '—'}</td>
                <td>{METODOS_PAGO[v.metodo_pago] || v.metodo_pago}</td>
                <td className="num">{v.cantidad_items}</td>
                <td className="num"><strong>{money(v.total)}</strong></td>
                <td>
                  <span className={v.estado === 'completada' ? 'badge badge-green' : 'badge badge-red'}>{v.estado}</span>
                  {v.estado === 'anulada' && v.anulada_por && <div className="cell-sub">por {v.anulada_por}</div>}
                </td>
                <td>
                  <div className="actions-inline nowrap">
                    <button className="btn btn-outline btn-sm" onClick={() => verDetalle(v.id)}><Icon name="eye" size={15} /> Ver</button>
                    {puedeAnular && v.estado === 'completada' && (
                      <button className="btn btn-danger btn-sm" onClick={() => anular(v)}>Anular</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} pages={data.pages} total={data.total} etiqueta="ventas" onChange={(p) => set('page', p)} />

      {detalle && (
        <ComprobanteModal venta={detalle} onClose={() => setDetalle(null)}
          onAnular={puedeAnular ? () => anular(detalle) : undefined} />
      )}
    </>
  )
}
