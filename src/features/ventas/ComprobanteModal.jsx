import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { fechaHora, METODOS_PAGO, money } from '../../utils/format'

/** Comprobante interno de venta, con formato de ticket de 80 mm al imprimir. */
export default function ComprobanteModal({ venta, onClose, recienCreada = false, onAnular }) {
  const anulada = venta.estado === 'anulada'
  return (
    <Modal size="md" onClose={onClose}
      titulo={`Venta ${venta.codigo}`}
      subtitulo={anulada ? 'Venta anulada' : recienCreada ? 'Venta registrada y stock actualizado' : fechaHora(venta.fecha)}
      footer={(
        <>
          {onAnular && !anulada && <button className="btn btn-danger" onClick={onAnular}><Icon name="ban" /> Anular venta</button>}
          <button className="btn btn-outline" onClick={() => window.print()}><Icon name="printer" /> Imprimir ticket</button>
          <button className="btn btn-primary" onClick={onClose}>{recienCreada ? 'Nueva venta' : 'Cerrar'}</button>
        </>
      )}>
      {recienCreada && <div className="alert alert-success no-print">Venta registrada correctamente.</div>}
      {anulada && (
        <div className="alert alert-error">
          <strong>Anulada</strong> el {fechaHora(venta.fecha_anulacion)} por {venta.anulada_por || '—'}.<br />
          Motivo: {venta.motivo_anulacion || '—'}
        </div>
      )}

      <div className="ticket" id="ticket-imprimible">
        <div className="ticket-head">
          <div className="ticket-brand">COOLBOX</div>
          <div>Comprobante interno de venta</div>
          <div className="ticket-code">{venta.codigo}</div>
          <div>{fechaHora(venta.fecha)}</div>
        </div>
        <div className="ticket-meta">
          <div><span>Atendido por</span><span>{venta.usuario_nombre}</span></div>
          <div><span>Cliente</span><span>{venta.cliente_nombre || 'Público general'}</span></div>
          <div><span>Pago</span><span>{METODOS_PAGO[venta.metodo_pago] || venta.metodo_pago}</span></div>
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
          <div><span>Op. gravada</span><span>{money(venta.subtotal)}</span></div>
          <div><span>IGV 18%</span><span>{money(venta.igv)}</span></div>
          <div className="grand"><span>TOTAL</span><span>{money(venta.total)}</span></div>
          {venta.monto_recibido != null && (
            <>
              <div><span>Recibido</span><span>{money(venta.monto_recibido)}</span></div>
              <div><span>Vuelto</span><span>{money(venta.vuelto)}</span></div>
            </>
          )}
        </div>
        {anulada && <div className="ticket-void">ANULADA</div>}
        <div className="ticket-foot">Gracias por su compra · Garantía según política de Coolbox</div>
      </div>
    </Modal>
  )
}
