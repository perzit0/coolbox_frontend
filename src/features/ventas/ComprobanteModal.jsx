export default function ComprobanteModal({ venta, onClose }) {
  const imprimir = () => window.print()
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card large">
        <header className="modal-header">
          <h3>Venta registrada: {venta.codigo}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="alert alert-success">Venta registrada correctamente. Stock actualizado.</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><strong>Atendido por:</strong><br/>{venta.usuario_nombre}</div>
            <div><strong>Rol:</strong><br/>{venta.rol}</div>
            <div><strong>Cliente:</strong><br/>{venta.cliente_nombre || '—'}</div>
            <div><strong>Documento:</strong><br/>{venta.cliente_documento || '—'}</div>
            <div><strong>Método de pago:</strong><br/>{venta.metodo_pago}</div>
            <div><strong>Fecha:</strong><br/>{new Date(venta.fecha).toLocaleString('es-PE')}</div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {venta.detalles.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: 'monospace' }}>{d.producto_codigo}</td>
                    <td>{d.producto_nombre}</td>
                    <td>{d.cantidad}</td>
                    <td>S/ {d.precio_unitario.toFixed(2)}</td>
                    <td><strong>S/ {d.subtotal.toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cart-totals" style={{ marginTop: '1rem' }}>
            <div className="cart-total-row"><span>Subtotal</span><span>S/ {venta.subtotal.toFixed(2)}</span></div>
            <div className="cart-total-row"><span>IGV</span><span>S/ {venta.igv.toFixed(2)}</span></div>
            <div className="cart-total-row grand"><span>Total</span><span>S/ {venta.total.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={imprimir}>Imprimir comprobante</button>
          <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
