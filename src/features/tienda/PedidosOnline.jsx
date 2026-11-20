import { useEffect, useState } from 'react'
import { abrirArchivo, pedidosOnlineApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { ESTADO_SUNAT, fechaHora, money } from '../../utils/format'

const TIPO_COMPROBANTE = { boleta: 'Boleta', nota_credito: 'Nota de crédito' }

const ESTADOS = {
  pendiente_pago: ['Pendiente de pago', 'badge-orange'], pagado: ['Pagado', 'badge-blue'],
  listo: ['Listo para recojo', 'badge-yellow'], entregado: ['Entregado', 'badge-green'], cancelado: ['Cancelado', 'badge-red'],
}
const PAGO = { tarjeta: 'Tarjeta', yape: 'Yape', plin: 'Plin', pagoefectivo: 'PagoEfectivo' }

/** Pedidos de la tienda online con recojo en sede: preparar, entregar (validando el documento) o cancelar. */
export default function PedidosOnline() {
  const fb = useFeedback()
  const [f, setF] = useState({ estado: 'pagado', sede: '', q: '' })
  const [datos, setDatos] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [doc, setDoc] = useState('')

  const cargar = () => pedidosOnlineApi.listar(f).then(setDatos).catch((e) => fb.error(e.detail))
  useEffect(() => { const t = setTimeout(cargar, 200); return () => clearTimeout(t) }, [f]) // eslint-disable-line react-hooks/exhaustive-deps

  const accion = async (p, nombre, payload) => {
    try {
      const r = await pedidosOnlineApi.accion(p.id, nombre, payload)
      fb.ok(r.mensaje); setDetalle(null); setDoc(''); cargar()
    } catch (e) { fb.error(e.detail) }
  }
  const cancelar = async (p) => {
    const motivo = await fb.confirmar({ titulo: `Cancelar pedido ${p.codigo}`, mensaje: 'Los productos vuelven al inventario. Esta acción no se puede deshacer.',
      textoConfirmar: 'Cancelar pedido', peligro: true, pedirMotivo: true, etiquetaMotivo: 'Motivo', minMotivo: 5 })
    if (motivo) accion(p, 'cancelar', { motivo })
  }
  const reintentar = async (p, tipo) => {
    try {
      const r = await pedidosOnlineApi.reintentarComprobante(p.id, tipo)
      setDetalle((d) => ({ ...r.pedido, entregar: d?.entregar })); cargar()
    } catch (e) { fb.error(e.detail) }
  }
  const abrir = (p, c, formato) => abrirArchivo(`/pedidos-online/${p.id}/comprobante/${c.tipo}/${formato}`).catch((e) => fb.error(e.detail))
  const c = datos?.conteo || {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pedidos online</h1>
          <p className="page-subtitle">Compras de la tienda web con recojo en tienda. Prepara el pedido y entrégalo solo al titular, verificando su documento.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={cargar}><Icon name="refresh" /> Actualizar</button>
      </div>
      <div className="segmented filtro-estado">
        {[['', 'Todos'], ...Object.entries(ESTADOS).map(([k, [l]]) => [k, l])].map(([k, l]) => (
          <button type="button" key={k} className={f.estado === k ? 'active' : ''} onClick={() => setF({ ...f, estado: k })}>
            {l}{k && c[k] ? ` (${c[k]})` : ''}
          </button>
        ))}
      </div>
      <div className="filter-bar">
        <div className="form-group compact"><label>Tienda de recojo</label>
          <select className="form-control" value={f.sede} onChange={(e) => setF({ ...f, sede: e.target.value })}>
            <option value="">Todas</option>{(datos?.sedes || []).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select></div>
        <div className="form-group compact" style={{ flex: 1 }}><label>Buscar</label>
          <input className="form-control" placeholder="N° de pedido, documento, nombre o correo" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
      </div>
      <div className="card">
        <div className="table-wrapper flat">
          <table className="data-table">
            <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Recojo en</th><th>Pago</th><th className="num">Total</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {!datos ? <tr><td colSpan="8" className="empty-cell">Cargando…</td></tr>
                : datos.pedidos.length === 0 ? <tr><td colSpan="8" className="empty-cell">No hay pedidos con estos filtros.</td></tr>
                  : datos.pedidos.map((p) => (
                    <tr key={p.id}>
                      <td><button type="button" className="link-btn mono" onClick={() => setDetalle(p)}><b>{p.codigo}</b></button></td>
                      <td className="small">{fechaHora(p.fecha)}</td>
                      <td>{p.cliente_nombre}<div className="muted small">{p.tipo_documento} {p.nro_documento} · {p.celular}</div></td>
                      <td className="small">{p.sede?.nombre}</td>
                      <td className="small">{PAGO[p.metodo_pago]}{p.marca_tarjeta ? ` ${p.marca_tarjeta} *${p.ultimos4}` : ''}{p.cip ? ` CIP ${p.cip}` : ''}</td>
                      <td className="num"><b>{money(p.total)}</b></td>
                      <td><span className={`badge ${ESTADOS[p.estado][1]}`}>{ESTADOS[p.estado][0]}</span></td>
                      <td>
                        <div className="pedido-acciones">
                          {p.estado === 'pendiente_pago' && <button type="button" className="btn btn-outline btn-sm" onClick={() => accion(p, 'confirmar-pago')}>Confirmar pago</button>}
                          {p.estado === 'pagado' && <button type="button" className="btn btn-outline btn-sm" onClick={() => accion(p, 'listo')}>Marcar listo</button>}
                          {['pagado', 'listo'].includes(p.estado) && <button type="button" className="btn btn-primary btn-sm" onClick={() => { setDoc(''); setDetalle({ ...p, entregar: true }) }}>Entregar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <Modal titulo={`${detalle.entregar ? 'Entregar pedido' : 'Pedido'} ${detalle.codigo}`} subtitulo={`${detalle.cliente_nombre} · ${detalle.email}`} onClose={() => setDetalle(null)}
          footer={<>
            {!['entregado', 'cancelado'].includes(detalle.estado) && <button type="button" className="btn btn-ghost" onClick={() => cancelar(detalle)}>Cancelar pedido</button>}
            {detalle.entregar
              ? <button type="button" className="btn btn-primary" disabled={doc.length < 6} onClick={() => accion(detalle, 'entregar', { nro_documento: doc })}><Icon name="check" size={16} /> Confirmar entrega</button>
              : <button type="button" className="btn btn-outline" onClick={() => setDetalle(null)}>Cerrar</button>}
          </>}>
          <ul className="pedido-detalle-items">
            {detalle.detalles.map((d) => (
              <li key={d.id}><span>{d.cantidad} x <b className="mono">{d.sku}</b> {d.nombre}{d.promocion_nombre ? <span className="pos"> · {d.promocion_nombre}</span> : null}</span><b>{money(d.subtotal)}</b></li>
            ))}
          </ul>
          <div className="small">Subtotal {money(detalle.subtotal)} · Promociones -{money(detalle.descuento)}{detalle.descuento_cupon > 0 ? ` · Cupón ${detalle.cupon} -${money(detalle.descuento_cupon)}` : ''} · <b>Total {money(detalle.total)}</b></div>
          {(detalle.comprobantes || []).length > 0 && (
            <div className="sunat-box">
              {detalle.comprobantes.map((cp) => (
                <div key={cp.id} className="sunat-row">
                  <div>
                    <strong>{TIPO_COMPROBANTE[cp.tipo]}</strong> {cp.numero || <span className="muted">sin número</span>}
                    <div className="cell-sub">{cp.sunat_mensaje || ''}</div>
                  </div>
                  <div className="actions-inline nowrap">
                    <span className={`badge ${(ESTADO_SUNAT[cp.estado_sunat] || {}).clase || 'badge-gray'}`}>{(ESTADO_SUNAT[cp.estado_sunat] || {}).label || cp.estado_sunat}</span>
                    {cp.tiene_pdf && <button type="button" className="btn btn-outline btn-sm" onClick={() => abrir(detalle, cp, 'pdf')}><Icon name="file" size={15} /> PDF</button>}
                    {cp.tiene_xml && <button type="button" className="btn btn-ghost btn-sm" onClick={() => abrir(detalle, cp, 'xml')}>XML</button>}
                    {['pendiente', 'error'].includes(cp.estado_sunat) && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => reintentar(detalle, cp.tipo)}><Icon name="refresh" size={15} /> Reintentar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="small muted">Recojo en {detalle.sede?.nombre} ({detalle.sede?.direccion}). {detalle.entregado_por ? `Entregado por ${detalle.entregado_por} el ${fechaHora(detalle.fecha_entrega)}.` : ''}{detalle.motivo_cancelacion ? ` Motivo de cancelación: ${detalle.motivo_cancelacion}` : ''}</p>
          {detalle.entregar && (
            <div className="form-group">
              <label>Documento del cliente ({detalle.tipo_documento}) — pídelo y escríbelo tal como figura</label>
              <input className="form-control mono" autoFocus value={doc} onChange={(e) => setDoc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))} placeholder="Número de documento" />
              <div className="form-help">Solo el titular de la compra puede recoger el pedido.</div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
