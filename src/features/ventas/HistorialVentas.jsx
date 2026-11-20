import { useEffect, useState } from 'react'
import { ventasApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Pagination from '../../components/Pagination'
import { fechaHora, hoyLima, METODO_LABEL, metodoLabel, money } from '../../utils/format'
import ComprobanteModal from './ComprobanteModal'
import DevolucionModal from './DevolucionModal'
import useAnularVenta from './useAnularVenta'

const FILTROS = { q: '', desde: '', hasta: '', estado: '', metodo_pago: '', usuario_id: '', page: 1 }

/** Historial de ventas con filtros y paginación.
 * - Supervisor de Caja / Administrador (ventas.anular): anulan directamente con motivo.
 * - Cajero (caja.operar): anula ventas de SU caja abierta con el PIN del supervisor,
 *   y reimprime comprobantes pasados también con PIN. */
export default function HistorialVentas({ puedeAnular = false, esCajero = false, usuarioId }) {
  const fb = useFeedback()
  const anularVenta = useAnularVenta({ puedeAnular })
  const [filtros, setFiltros] = useState(FILTROS)
  const [data, setData] = useState({ ventas: [], total: 0, pages: 1, page: 1 })
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)
  const [devolviendo, setDevolviendo] = useState(null)

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

  const puedeAnularVenta = (v) => v.estado === 'completada' && v.caja_estado !== 'cerrada' && !(v.monto_devuelto > 0)
    && (puedeAnular || (esCajero && v.usuario_id === usuarioId && v.caja_estado === 'abierta'))

  // Devolución (después de la compra): en caja, con PIN, sobre una venta con boleta o factura aceptada.
  const puedeDevolver = (v) => esCajero && v.estado === 'completada' && v.estado_sunat === 'aceptado'
    && v.estado_devolucion !== 'total'

  const abrirDevolucion = async (v) => {
    try { setDevolviendo(v.detalles ? v : (await ventasApi.obtener(v.id)).venta) } catch (err) { fb.error(err.detail) }
  }

  const devuelta = (venta) => {
    setDevolviendo(null)
    if (detalle?.id === venta.id) setDetalle(venta)
    cargar()
  }

  const anular = async (v) => {
    const anulada = await anularVenta(v)
    if (!anulada) return
    if (detalle?.id === v.id) setDetalle(anulada)
    cargar()
  }

  const hayFiltros = Object.entries(filtros).some(([k, v]) => k !== 'page' && v)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de ventas</h1>
          <p className="page-subtitle">
            {puedeAnular ? 'Consulta, reimprime y anula ventas registradas.'
              : esCajero ? 'Consulta tus ventas. Anular o reimprimir requiere el PIN del supervisor.' : 'Consulta las ventas registradas.'}
          </p>
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
          <input className="form-control" placeholder="Código, cliente, DNI o N° de operación…" value={filtros.q} onChange={(e) => set('q', e.target.value)} />
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
          {Object.entries(METODO_LABEL).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        {vendedores.length > 1 && (
          <select className="form-control" value={filtros.usuario_id} onChange={(e) => set('usuario_id', e.target.value)}>
            <option value="">Todos los cajeros</option>
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
              <th>Cajero</th>
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
                <td className="mono nowrap"><strong>{v.codigo}</strong></td>
                <td className="nowrap">{fechaHora(v.fecha)}</td>
                <td>{v.usuario_nombre}<div className="cell-sub">{v.rol}{v.caja_codigo ? <span className="nowrap"> · Caja {v.caja_codigo}</span> : ''}</div></td>
                <td>{v.cliente_nombre || '—'}</td>
                <td>{metodoLabel(v.metodo_pago)}{v.descuento > 0 && <div className="cell-sub">Desc. {money(v.descuento)}</div>}</td>
                <td className="num">{v.cantidad_items}</td>
                <td className="num"><strong>{money(v.total)}</strong></td>
                <td>
                  <span className={v.estado === 'completada' ? 'badge badge-green' : 'badge badge-red'}>{v.estado}</span>
                  {v.estado_devolucion && v.estado_devolucion !== 'ninguna' && (
                    <div className="cell-sub"><span className="badge badge-orange">Devolución {v.estado_devolucion}</span> {money(v.monto_devuelto)}</div>
                  )}
                  {v.comprobante && <div className="cell-sub mono">{v.comprobante}</div>}
                  {v.estado === 'anulada' && v.anulada_por && (
                    <div className="cell-sub">por {v.anulada_por}{v.autorizada_por ? ` · aut. ${v.autorizada_por}` : ''}</div>
                  )}
                </td>
                <td>
                  <div className="actions-inline nowrap">
                    <button className="btn btn-outline btn-sm" onClick={() => verDetalle(v.id)}><Icon name="eye" size={15} /> Ver</button>
                    {puedeDevolver(v) && (
                      <button className="btn btn-outline btn-sm" onClick={() => abrirDevolucion(v)}><Icon name="undo" size={15} /> Devolver</button>
                    )}
                    {puedeAnularVenta(v) && (
                      <button className="btn btn-danger btn-sm" onClick={() => anular(v)}>
                        {!puedeAnular && <Icon name="shield" size={13} />} Anular
                      </button>
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
        <ComprobanteModal venta={detalle} onClose={() => setDetalle(null)} reimpresionConPin={!puedeAnular && esCajero}
          onAnular={puedeAnularVenta(detalle) ? () => anular(detalle) : undefined}
          onDevolver={puedeDevolver(detalle) ? () => abrirDevolucion(detalle) : undefined}
          puedeReintentar={esCajero} onActualizar={(v) => { setDetalle(v); cargar() }} />
      )}
      {devolviendo && <DevolucionModal venta={devolviendo} onClose={() => setDevolviendo(null)} onDone={devuelta} />}
    </>
  )
}
