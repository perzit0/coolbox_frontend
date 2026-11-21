import { useEffect, useMemo, useState } from 'react'
import { pedidosOnlineApi, ventasApi } from '../../api/client'
import { useAutorizacion } from '../../components/Autorizacion'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { metodoLabel, money } from '../../utils/format'
import PosSimulado from '../ventas/PosSimulado'

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100
const PAGO = { tarjeta: 'Tarjeta', yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia bancaria' }

/** Devolución de productos de un pedido online ya entregado (el cliente vuelve a la sede).
 *
 * Como en caja: se elige qué y cuánto vuelve, si regresa al stock y el motivo; el supervisor
 * autoriza con su PIN. El dinero vuelve al mismo medio con el que pagó (PagoEfectivo se devuelve
 * por transferencia) y se emite la nota de crédito que modifica la boleta del pedido.
 * El importe mostrado es estimado: el exacto lo calcula el procedimiento almacenado. */
export default function DevolucionPedidoModal({ pedido, onClose, onDone }) {
  const fb = useFeedback()
  const autorizar = useAutorizacion()
  const [cantidades, setCantidades] = useState({})
  const [noReingresa, setNoReingresa] = useState({})
  const [motivo, setMotivo] = useState('')
  const [operacion, setOperacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pos, setPos] = useState(null)
  const [config, setConfig] = useState({ pos_proveedor: '', marcas_tarjeta: [] })
  useEffect(() => { ventasApi.config().then(setConfig).catch(() => {}) }, [])

  const metodo = pedido.metodo_pago === 'pagoefectivo' ? 'transferencia' : pedido.metodo_pago
  const conPos = metodo !== 'transferencia'
  const factor = useMemo(() => {
    const suma = pedido.detalles.reduce((s, d) => s + d.subtotal, 0)
    return suma ? pedido.total / suma : 1
  }, [pedido])
  const lineas = pedido.detalles.map((d) => ({ ...d, disponible: d.cantidad - (d.cantidad_devuelta || 0) }))
  const completa = lineas.every((d) => (cantidades[d.id] || 0) === d.disponible)
  const estimado = completa ? r2(pedido.total - (pedido.monto_devuelto || 0))
    : r2(lineas.reduce((s, d) => s + r2((d.subtotal / d.cantidad) * (cantidades[d.id] || 0) * factor), 0))
  const items = lineas.filter((d) => cantidades[d.id] > 0)
  const operacionValida = conPos || /^[A-Z0-9-]{4,30}$/.test(operacion)
  const valido = items.length > 0 && motivo.trim().length >= 10 && operacionValida
  const setCantidad = (d, v) => setCantidades((c) => ({ ...c, [d.id]: Math.max(0, Math.min(d.disponible, Number.parseInt(v, 10) || 0)) }))

  async function confirmar(e) {
    e.preventDefault()
    if (!valido || enviando) return
    const aut = await autorizar({
      accion: 'DEVOLUCION', monto: estimado,
      descripcion: `Pedido ${pedido.codigo}: devolver ${money(estimado)} por ${PAGO[metodo] || metodoLabel(metodo)} y emitir nota de crédito.`,
    })
    if (!aut) return
    let nro = operacion
    if (conPos) {
      const extorno = await new Promise((resolve) => setPos({ resolve }))
      if (!extorno) { fb.info('Extorno cancelado: la devolución no se registró.'); return }
      nro = extorno.nro_operacion
    }
    setEnviando(true)
    try {
      const r = await pedidosOnlineApi.devolver(pedido.id, {
        items: items.map((d) => ({ pedido_detalle_id: d.id, cantidad: cantidades[d.id], reingresa_stock: !noReingresa[d.id] })),
        motivo: motivo.trim(), metodo_reembolso: metodo, nro_operacion: nro, autorizacion_token: aut.token,
      })
      if (r.devolucion.estado_sunat === 'aceptado') fb.ok(r.mensaje)
      else fb.info(r.mensaje)
      onDone?.(r.pedido)
    } catch (err) {
      fb.error(err.detail || 'No fue posible registrar la devolución.')
    } finally {
      setEnviando(false)
    }
  }

  const boleta = (pedido.comprobantes || []).find((c) => c.tipo === 'boleta')
  return (
    <Modal size="lg" as="form" onClose={onClose} onSubmit={confirmar}
      titulo={`Devolución del pedido ${pedido.codigo}`}
      subtitulo={`Boleta ${boleta?.numero || ''} · ${pedido.cliente_nombre} (${pedido.tipo_documento} ${pedido.nro_documento})`}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valido || enviando}>
          <Icon name="shield" /> {enviando ? 'Registrando…' : `Devolver ${money(estimado)} con PIN`}
        </button>
      </>}>
      <div className="table-wrapper" style={{ marginBottom: 16 }}>
        <table className="data-table">
          <thead><tr><th>Producto</th><th className="num">Compradas</th><th className="num">Por devolver</th><th className="num">Devolver</th><th>Vuelve al stock</th></tr></thead>
          <tbody>
            {lineas.map((d) => (
              <tr key={d.id} className={d.disponible === 0 ? 'row-muted' : ''}>
                <td>{d.nombre}<div className="cell-sub">SKU {d.sku} · {money(d.subtotal / d.cantidad)} c/u</div></td>
                <td className="num">{d.cantidad}</td>
                <td className="num">{d.disponible}</td>
                <td className="num">
                  <input className="form-control" type="number" min="0" max={d.disponible} style={{ width: 80 }} disabled={d.disponible === 0}
                    value={cantidades[d.id] || ''} placeholder="0" onChange={(e) => setCantidad(d, e.target.value)} />
                </td>
                <td>
                  <label className="inline-label">
                    <input type="checkbox" disabled={!cantidades[d.id]} checked={!noReingresa[d.id]}
                      onChange={(e) => setNoReingresa((x) => ({ ...x, [d.id]: !e.target.checked }))} />
                    {noReingresa[d.id] ? 'No (falla: servicio técnico)' : 'Sí'}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="form-group">
        <label>Motivo de la devolución</label>
        <textarea className="form-control" rows={2} maxLength={240} value={motivo} onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. El equipo no enciende; se revisó en tienda." />
        {motivo && motivo.trim().length < 10 && <div className="form-help">Mínimo 10 caracteres.</div>}
      </div>
      <div className="form-group">
        <label>Reembolso por {PAGO[metodo] || metodoLabel(metodo)} (el mismo medio con el que pagó)</label>
        {conPos ? (
          <div className="form-help">Tras el PIN se abrirá el POS para procesar el extorno a la {metodo === 'tarjeta' ? `tarjeta ${pedido.marca_tarjeta || ''} *${pedido.ultimos4 || ''}` : `cuenta ${metodoLabel(metodo)} del cliente`}.</div>
        ) : (
          <>
            <input className="form-control mono" maxLength={30} value={operacion} placeholder="N° de operación de la transferencia"
              onChange={(e) => setOperacion(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} />
            <div className="form-help">Pagó con PagoEfectivo: la devolución se hace por transferencia a la cuenta del cliente.</div>
          </>
        )}
      </div>
      <div className="form-help">Se emitirá una nota de crédito que modifica la boleta {boleta?.numero}.</div>
      {pos && (
        <PosSimulado metodo={metodo} monto={estimado} proveedor={config.pos_proveedor} marcas={config.marcas_tarjeta}
          onDone={(res) => { pos.resolve(res); setPos(null) }} />
      )}
    </Modal>
  )
}
