import { useState } from 'react'
import { useAutorizacion } from '../../components/Autorizacion'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { fechaHora, metodoLabel, money } from '../../utils/format'

const TIPO_TARJETA = { debito: 'débito', credito: 'crédito' }

/** Comprobante interno de venta, con formato de ticket de 80 mm al imprimir.
 * reimpresionConPin: el cajero solo reimprime una venta pasada con PIN del supervisor
 * (evita entregar copias que se usen para reclamos o devoluciones duplicadas). */
export default function ComprobanteModal({ venta, onClose, recienCreada = false, onAnular, reimpresionConPin = false }) {
  const autorizar = useAutorizacion()
  const [copia, setCopia] = useState(false)
  const anulada = venta.estado === 'anulada'

  async function imprimir() {
    if (reimpresionConPin && !recienCreada) {
      const ok = await autorizar({ accion: 'REIMPRESION', descripcion: `Comprobante ${venta.codigo}`, venta_id: venta.id })
      if (!ok) return
      setCopia(true)
      setTimeout(() => window.print(), 50)
      return
    }
    window.print()
  }

  return (
    <Modal size="md" onClose={onClose}
      titulo={`Venta ${venta.codigo}`}
      subtitulo={anulada ? 'Venta anulada' : recienCreada ? 'Venta registrada y stock actualizado' : fechaHora(venta.fecha)}
      footer={(
        <>
          {onAnular && !anulada && (
            <button className="btn btn-danger" onClick={onAnular}>
              <Icon name={reimpresionConPin || recienCreada ? 'shield' : 'ban'} /> Anular venta
            </button>
          )}
          <button className="btn btn-outline" onClick={imprimir}>
            <Icon name="printer" /> {reimpresionConPin && !recienCreada ? 'Reimprimir (supervisor)' : 'Imprimir ticket'}
          </button>
          <button className="btn btn-primary" onClick={onClose}>{recienCreada ? 'Nueva venta' : 'Cerrar'}</button>
        </>
      )}>
      {recienCreada && !anulada && <div className="alert alert-success no-print">Venta registrada correctamente.</div>}
      {anulada && (
        <div className="alert alert-error">
          <strong>Anulada</strong> el {fechaHora(venta.fecha_anulacion)} por {venta.anulada_por || '—'}
          {venta.autorizada_por ? `, autorizada por ${venta.autorizada_por}` : ''}.<br />
          Motivo: {venta.motivo_anulacion || '—'}
        </div>
      )}

      <div className="ticket" id="ticket-imprimible">
        <div className="ticket-head">
          <div className="ticket-brand">COOLBOX</div>
          <div>Comprobante interno de venta</div>
          <div className="ticket-code">{venta.codigo}</div>
          <div>{fechaHora(venta.fecha)}</div>
          {copia && <div className="ticket-copia">REIMPRESIÓN · COPIA</div>}
        </div>
        <div className="ticket-meta">
          <div><span>Cajero</span><span>{venta.usuario_nombre}</span></div>
          {venta.caja_codigo && <div><span>Caja</span><span>{venta.caja_codigo}</span></div>}
          <div><span>Cliente</span><span>{venta.cliente_nombre || 'Público general'}</span></div>
          {venta.cliente_documento && <div><span>Documento</span><span>{venta.cliente_documento}</span></div>}
        </div>
        <table className="ticket-items">
          <thead><tr><th>Cant.</th><th>Descripción</th><th className="num">Importe</th></tr></thead>
          <tbody>
            {venta.detalles.map((d) => (
              <tr key={d.id}>
                <td>{d.cantidad}</td>
                <td>
                  {d.producto_nombre}
                  <div className="ticket-sub">SKU {d.producto_sku || d.producto_codigo} · {money(d.precio_unitario)} c/u</div>
                </td>
                <td className="num">{money(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ticket-totals">
          {venta.descuento > 0 && (
            <>
              <div><span>Subtotal</span><span>{money(venta.total + venta.descuento)}</span></div>
              <div><span>Descuento</span><span>- {money(venta.descuento)}</span></div>
            </>
          )}
          <div><span>Op. gravada</span><span>{money(venta.subtotal)}</span></div>
          <div><span>IGV 18%</span><span>{money(venta.igv)}</span></div>
          <div className="grand"><span>TOTAL</span><span>{money(venta.total)}</span></div>
        </div>
        <div className="ticket-totals">
          {(venta.pagos || []).map((p, i) => (
            <div key={p.id || i} className="ticket-pago">
              <div>
                <span>{metodoLabel(p.metodo)}{p.tipo_tarjeta ? ` ${TIPO_TARJETA[p.tipo_tarjeta]}` : ''}{p.proveedor ? ` · ${p.proveedor}` : ''}</span>
                <span>{money(p.monto)}</span>
              </div>
              {p.nro_operacion && <div className="ticket-sub">Op. {p.nro_operacion}</div>}
              {p.monto_recibido != null && (
                <div className="ticket-sub">Recibido {money(p.monto_recibido)} · Vuelto {money(p.vuelto)}</div>
              )}
            </div>
          ))}
        </div>
        {venta.autorizada_por && !anulada && <div className="ticket-foot">Descuento autorizado por {venta.autorizada_por}</div>}
        {anulada && <div className="ticket-void">ANULADA</div>}
        <div className="ticket-foot">Gracias por su compra · Garantía según política de Coolbox</div>
      </div>
    </Modal>
  )
}
