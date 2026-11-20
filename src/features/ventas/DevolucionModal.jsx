import { useEffect, useMemo, useState } from 'react'
import { ventasApi } from '../../api/client'
import { useAutorizacion } from '../../components/Autorizacion'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { metodoLabel, money } from '../../utils/format'
import PosSimulado from './PosSimulado'

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100

/** Devolución de productos de una venta ya cobrada, con nota de crédito electrónica.
 *
 * El cajero elige qué y cuánto devuelve, si cada producto vuelve al stock, el motivo
 * y por qué medio reembolsa. El supervisor autoriza con su PIN y el backend registra
 * la devolución, mueve el stock, descuenta el dinero de la caja y emite la nota de crédito.
 * El importe que se muestra es estimado: el definitivo lo calcula el backend. */
export default function DevolucionModal({ venta, onClose, onDone }) {
  const fb = useFeedback()
  const autorizar = useAutorizacion()
  const [cantidades, setCantidades] = useState({})
  const [noReingresa, setNoReingresa] = useState({})
  const [motivo, setMotivo] = useState('')
  const metodos = useMemo(() => [...new Set((venta.pagos || []).map((p) => p.metodo))], [venta])
  const [metodo, setMetodo] = useState(metodos.includes('efectivo') ? 'efectivo' : metodos[0])
  const [enviando, setEnviando] = useState(false)
  const [pos, setPos] = useState(null) // extorno en el POS de pruebas
  const [config, setConfig] = useState({ pos_proveedor: '', marcas_tarjeta: [] })
  useEffect(() => { ventasApi.config().then(setConfig).catch(() => {}) }, [])

  // Lo cobrado ya incluye promociones y descuento global: el reembolso es proporcional.
  const factor = useMemo(() => {
    const suma = venta.detalles.reduce((s, d) => s + d.subtotal, 0)
    return suma ? venta.total / suma : 1
  }, [venta])
  const lineas = venta.detalles.map((d) => ({ ...d, disponible: d.cantidad - (d.cantidad_devuelta || 0) }))
  // Igual que el backend: se redondea cada línea y, si se devuelve todo lo que queda, el total es exacto.
  const completa = lineas.every((d) => (cantidades[d.id] || 0) === d.disponible)
  const estimado = completa ? r2(venta.total - (venta.monto_devuelto || 0))
    : r2(lineas.reduce((s, d) => s + r2((d.subtotal / d.cantidad) * (cantidades[d.id] || 0) * factor), 0))
  const items = lineas.filter((d) => cantidades[d.id] > 0)
  const requiereOperacion = metodo && metodo !== 'efectivo'
  const valido = items.length > 0 && motivo.trim().length >= 10 && metodo

  const setCantidad = (d, valor) => {
    const n = Math.max(0, Math.min(d.disponible, Number.parseInt(valor, 10) || 0))
    setCantidades((c) => ({ ...c, [d.id]: n }))
  }

  async function confirmar(e) {
    e.preventDefault()
    if (!valido || enviando) return
    const aut = await autorizar({
      accion: 'DEVOLUCION', venta_id: venta.id, monto: estimado,
      descripcion: `Venta ${venta.codigo}: devolver ${money(estimado)} por ${metodoLabel(metodo)} y emitir nota de crédito.`,
    })
    if (!aut) return
    // Tarjeta, Yape o Plin: el extorno se procesa en el POS de pruebas, que da el N° de operación.
    let extorno = null
    if (requiereOperacion) {
      extorno = await new Promise((resolve) => setPos({ resolve }))
      if (!extorno) { fb.info('Extorno cancelado: la devolución no se registró.'); return }
    }
    setEnviando(true)
    try {
      const r = await ventasApi.devolver(venta.id, {
        items: items.map((d) => ({ venta_detalle_id: d.id, cantidad: cantidades[d.id], reingresa_stock: !noReingresa[d.id] })),
        motivo: motivo.trim(), metodo_reembolso: metodo,
        nro_operacion: extorno ? extorno.nro_operacion : undefined,
        autorizacion_token: aut.token,
      })
      const dev = r.devolucion
      if (dev.estado_sunat === 'aceptado') {
        fb.ok(`Devolución ${dev.codigo} registrada. Nota de crédito ${dev.nota_credito} aceptada por SUNAT.`)
      } else {
        fb.info(`Devolución ${dev.codigo} registrada. La nota de crédito quedó pendiente: reintenta desde el detalle de la venta.`)
      }
      onDone?.(r.venta)
    } catch (err) {
      fb.error(err.detail || 'No fue posible registrar la devolución.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal size="lg" as="form" onClose={onClose} onSubmit={confirmar}
      titulo={`Devolución de la venta ${venta.codigo}`}
      subtitulo={`${venta.tipo_comprobante === 'factura' ? 'Factura' : 'Boleta'} ${venta.comprobante} · ${venta.cliente_nombre} (${venta.cliente_documento})`}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valido || enviando}>
            <Icon name="shield" /> {enviando ? 'Registrando…' : `Devolver ${money(estimado)} con PIN`}
          </button>
        </>
      )}>
      <div className="table-wrapper" style={{ marginBottom: 16 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="num">Vendidas</th>
              <th className="num">Por devolver</th>
              <th className="num">Devolver</th>
              <th>Vuelve al stock</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((d) => (
              <tr key={d.id} className={d.disponible === 0 ? 'row-muted' : ''}>
                <td>{d.producto_nombre}<div className="cell-sub">SKU {d.producto_sku || d.producto_codigo} · {money(d.subtotal / d.cantidad)} c/u</div></td>
                <td className="num">{d.cantidad}</td>
                <td className="num">{d.disponible}</td>
                <td className="num">
                  <input className="form-control" type="number" min="0" max={d.disponible} style={{ width: 80 }}
                    disabled={d.disponible === 0} value={cantidades[d.id] || ''} placeholder="0"
                    onChange={(e) => setCantidad(d, e.target.value)} />
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
          placeholder="Ej. El producto no enciende; falla de fábrica revisada en tienda." />
        {motivo && motivo.trim().length < 10 && <div className="form-help">Mínimo 10 caracteres.</div>}
      </div>

      <div className="form-row compact-row">
        <div className="form-group compact">
          <label>Reembolso por</label>
          <select className="form-control" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {metodos.map((m) => <option key={m} value={m}>{metodoLabel(m)}</option>)}
          </select>
        </div>
      </div>
      <div className="form-help">
        {metodo === 'efectivo' ? 'Entrega el efectivo de tu gaveta; se descuenta del efectivo esperado de tu caja.'
          : 'Tras el PIN se abrirá el POS para procesar el extorno.'}
        {' '}Se emitirá una nota de crédito que modifica el comprobante {venta.comprobante}.
      </div>
      {pos && (
        <PosSimulado metodo={metodo} monto={estimado} proveedor={config.pos_proveedor} marcas={config.marcas_tarjeta}
          onDone={(r) => { pos.resolve(r); setPos(null) }} />
      )}
    </Modal>
  )
}
