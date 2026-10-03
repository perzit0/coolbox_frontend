import { useState } from 'react'
import { productosApi } from '../../api/client'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import ProductoImagen from '../../components/ProductoImagen'
import SkuCode from '../../components/SkuCode'

const TIPOS = [
  { id: 'entrada', label: 'Entrada', icon: 'arrowIn', ayuda: 'Recepción de mercadería del proveedor o traslado desde otra tienda.' },
  { id: 'salida', label: 'Salida', icon: 'arrowOut', ayuda: 'Merma, producto dañado, envío a garantía o traslado a otra tienda.' },
  { id: 'ajuste', label: 'Ajuste por conteo', icon: 'scale', ayuda: 'Fija el stock al valor contado físicamente en el inventario.' },
]

const MOTIVOS = {
  entrada: ['Recepción de mercadería (guía de remisión)', 'Traslado desde otra tienda', 'Devolución de garantía'],
  salida: ['Producto dañado / merma', 'Envío a servicio técnico (garantía)', 'Traslado a otra tienda', 'Exhibición'],
  ajuste: ['Conteo físico de inventario', 'Corrección de error de registro'],
}

export default function MovimientoModal({ producto, tipoInicial = 'entrada', onClose, onGuardado }) {
  const [tipo, setTipo] = useState(tipoInicial)
  const [cantidad, setCantidad] = useState(tipoInicial === 'ajuste' ? String(producto.stock) : '1')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const n = Number(cantidad)
  const resultante = tipo === 'entrada' ? producto.stock + n : tipo === 'salida' ? producto.stock - n : n
  const motivoObligatorio = tipo !== 'entrada'
  const valido = Number.isInteger(n) && (tipo === 'ajuste' ? n >= 0 && n !== producto.stock : n > 0)
    && resultante >= 0 && (!motivoObligatorio || motivo.trim().length >= 5)

  const cambiarTipo = (t) => {
    setTipo(t)
    setCantidad(t === 'ajuste' ? String(producto.stock) : '1')
    setMotivo('')
    setError('')
  }

  async function guardar(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const r = await productosApi.moverStock(producto.id, { tipo, cantidad: n, motivo })
      onGuardado(r.producto, tipo)
    } catch (err) {
      setError(err.detail)
    } finally { setSending(false) }
  }

  const def = TIPOS.find((t) => t.id === tipo)
  return (
    <Modal as="form" onSubmit={guardar} onClose={onClose} titulo="Registrar movimiento de almacén"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!valido || sending}>
            {sending ? <span className="spinner" /> : 'Registrar movimiento'}
          </button>
        </>
      )}>
      <div className="mov-product">
        <ProductoImagen producto={producto} size="sm" />
        <div>
          <SkuCode sku={producto.sku} producto={producto} size="sm" />
          <div className="mov-product-name">{producto.nombre}</div>
          <div className="cell-sub">Stock actual: <strong>{producto.stock}</strong> · mínimo {producto.stock_minimo}</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tipo-mov">
        {TIPOS.map((t) => (
          <button key={t.id} type="button" className={`tipo-mov-btn ${tipo === t.id ? 'active' : ''} tipo-${t.id}`} onClick={() => cambiarTipo(t.id)}>
            <Icon name={t.icon} size={20} /> {t.label}
          </button>
        ))}
      </div>
      <p className="form-help" style={{ marginTop: 0 }}>{def.ayuda}</p>

      <div className="form-row">
        <div className="form-group">
          <label>{tipo === 'ajuste' ? 'Stock contado' : 'Cantidad'}</label>
          <input className="form-control" type="number" min={tipo === 'ajuste' ? 0 : 1} step="1" value={cantidad} autoFocus
            onChange={(e) => setCantidad(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Stock resultante</label>
          <div className={`stock-resultante ${resultante < 0 ? 'neg' : ''}`}>
            {producto.stock} <Icon name="chevronRight" size={14} /> <strong>{Number.isFinite(resultante) ? resultante : '—'}</strong>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Motivo {motivoObligatorio ? '(obligatorio)' : '(opcional)'}</label>
        <input className="form-control" list={`motivos-${tipo}`} value={motivo} maxLength={240}
          placeholder={tipo === 'entrada' ? 'Ej: Guía de remisión 001-004512' : 'Describe el motivo'}
          onChange={(e) => setMotivo(e.target.value)} />
        <datalist id={`motivos-${tipo}`}>{MOTIVOS[tipo].map((m) => <option key={m} value={m} />)}</datalist>
      </div>
    </Modal>
  )
}
