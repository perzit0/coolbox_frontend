import { useEffect, useRef, useState } from 'react'
import { catalogoApi, productosApi } from '../../api/client'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import ProductoImagen from '../../components/ProductoImagen'
import SkuCode from '../../components/SkuCode'
import { invalidarCatalogo } from './useCatalogo'

/** Reduce la foto a máx. 600 px y la convierte a JPEG (data URL) para guardarla
 * liviana en la base de datos. */
function reducirImagen(file, maxLado = 600, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('El archivo debe ser una imagen.')); return }
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff' // fondo blanco para PNG con transparencia
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', calidad))
      }
      img.src = lector.result
    }
    lector.readAsDataURL(file)
  })
}

export default function ProductoForm({ producto, familias, marcas: marcasIniciales, onClose, onGuardado }) {
  const esNuevo = !producto
  const [marcas, setMarcas] = useState(marcasIniciales)
  const [form, setForm] = useState({
    familia_id: producto?.familia_id || '',
    subfamilia_id: producto?.subfamilia_id || '',
    marca_id: producto?.marca_id || '',
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    precio: producto?.precio ?? '',
    stock: 0,
    stock_minimo: producto?.stock_minimo ?? 5,
    activo: producto?.activo ?? true,
    imagen_url: producto?.imagen_url || '',
  })
  const [urlManual, setUrlManual] = useState(
    producto?.imagen_url && !producto.imagen_url.startsWith('data:') ? producto.imagen_url : ''
  )
  const [skuPreview, setSkuPreview] = useState('')
  const [nuevaMarca, setNuevaMarca] = useState(null)
  const inputArchivo = useRef(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const familia = familias.find((f) => String(f.id) === String(form.familia_id))
  const subfamilia = familia?.subfamilias.find((s) => String(s.id) === String(form.subfamilia_id))
  const marca = marcas.find((m) => String(m.id) === String(form.marca_id))

  // SKU que se asignará (solo al registrar)
  useEffect(() => {
    if (!esNuevo || !form.subfamilia_id || !form.marca_id) { setSkuPreview(''); return }
    catalogoApi.skuPreview(form.subfamilia_id, form.marca_id)
      .then((r) => setSkuPreview(r.sku))
      .catch((err) => { setSkuPreview(''); setError(err.detail) })
  }, [esNuevo, form.subfamilia_id, form.marca_id])

  async function onArchivo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      set('imagen_url', await reducirImagen(file))
      setUrlManual('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function crearMarca() {
    if (!nuevaMarca?.trim()) return
    try {
      const r = await catalogoApi.crearMarca(nuevaMarca.trim())
      invalidarCatalogo()
      setMarcas((m) => [...m, r.marca].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      set('marca_id', r.marca.id)
      setNuevaMarca(null)
    } catch (err) {
      setError(err.detail)
    }
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (esNuevo && (!form.subfamilia_id || !form.marca_id)) { setError('Seleccione familia, subfamilia y marca para generar el SKU.'); return }
    setSending(true)
    try {
      const payload = {
        ...form,
        precio: Number(form.precio),
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
      }
      const r = esNuevo ? await productosApi.crear(payload) : await productosApi.editar(producto.id, payload)
      onGuardado(r.producto, esNuevo)
    } catch (err) {
      setError(err.detail || 'No fue posible guardar.')
    } finally { setSending(false) }
  }

  const vistaPrevia = { ...form, familia: familia?.nombre, marca: marca?.nombre }

  return (
    <Modal as="form" onSubmit={guardar} size="lg" onClose={onClose}
      titulo={esNuevo ? 'Registrar producto' : 'Editar producto'}
      subtitulo={esNuevo ? 'El SKU se genera automáticamente según familia, subfamilia y marca.' : producto.nombre}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? <span className="spinner" /> : esNuevo ? 'Registrar producto' : 'Guardar cambios'}
          </button>
        </>
      )}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* ---- Clasificación y SKU ---- */}
      <fieldset className="fieldset">
        <legend>Clasificación y SKU</legend>
        {esNuevo ? (
          <>
            <div className="form-row three">
              <div className="form-group">
                <label>Familia</label>
                <select className="form-control" value={form.familia_id} required
                  onChange={(e) => setForm((f) => ({ ...f, familia_id: e.target.value, subfamilia_id: '' }))}>
                  <option value="">Seleccione…</option>
                  {familias.map((f) => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Subfamilia</label>
                <select className="form-control" value={form.subfamilia_id} required disabled={!familia}
                  onChange={(e) => set('subfamilia_id', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {familia?.subfamilias.map((s) => <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Marca</label>
                {nuevaMarca === null ? (
                  <div className="input-group">
                    <select className="form-control" value={form.marca_id} required onChange={(e) => set('marca_id', e.target.value)}>
                      <option value="">Seleccione…</option>
                      {marcas.map((m) => <option key={m.id} value={m.id}>{m.codigo} · {m.nombre}</option>)}
                    </select>
                    <button type="button" className="input-addon" title="Registrar nueva marca" onClick={() => setNuevaMarca('')}>
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="input-group">
                    <input className="form-control" autoFocus placeholder="Nombre de la marca" value={nuevaMarca}
                      onChange={(e) => setNuevaMarca(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); crearMarca() } }} />
                    <button type="button" className="input-addon" title="Guardar marca" onClick={crearMarca}><Icon name="check" size={16} /></button>
                    <button type="button" className="input-addon" title="Cancelar" onClick={() => setNuevaMarca(null)}><Icon name="x" size={16} /></button>
                  </div>
                )}
              </div>
            </div>
            <div className="sku-preview">
              <span className="sku-preview-label">SKU asignado</span>
              {skuPreview ? <SkuCode sku={skuPreview} producto={{ familia: familia?.nombre, subfamilia: subfamilia?.nombre, marca: marca?.nombre }} size="lg" />
                : <span className="muted">Elige familia, subfamilia y marca</span>}
            </div>
          </>
        ) : (
          <div className="sku-preview">
            <span className="sku-preview-label">SKU</span>
            <SkuCode sku={producto.sku} producto={producto} size="lg" />
            <span className="muted small">{producto.familia} · {producto.subfamilia} · {producto.marca}. El SKU es inmutable.</span>
          </div>
        )}
      </fieldset>

      {/* ---- Datos comerciales ---- */}
      <div className="form-group">
        <label>Nombre comercial</label>
        <input className="form-control" value={form.nombre} maxLength={180} required
          placeholder='Ej: Laptop HP 15-fc0025wm 15.6", AMD Ryzen 5, 1TB SSD, 8GB RAM'
          onChange={(e) => set('nombre', e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Código de referencia del fabricante</label>
          <input className="form-control mono" value={form.codigo} maxLength={30} placeholder="Opcional (p. ej. HP15FC0025-T)"
            onChange={(e) => set('codigo', e.target.value.toUpperCase())} />
        </div>
        <div className="form-group">
          <label>Precio de venta (S/, IGV incluido)</label>
          <input className="form-control" type="number" step="0.01" min="0.01" value={form.precio} required
            onChange={(e) => set('precio', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Descripción</label>
        <textarea className="form-control" rows="2" maxLength={500} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
      </div>
      <div className="form-row">
        {esNuevo ? (
          <div className="form-group">
            <label>Stock inicial</label>
            <input className="form-control" type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
            <div className="form-help">Se registra en el kardex como "Stock inicial".</div>
          </div>
        ) : (
          <div className="form-group">
            <label>Stock actual</label>
            <input className="form-control" value={producto.stock} disabled />
            <div className="form-help">Se modifica desde Almacén (entradas, salidas y ajustes).</div>
          </div>
        )}
        <div className="form-group">
          <label>Stock mínimo</label>
          <input className="form-control" type="number" min="0" value={form.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} />
          <div className="form-help">Por debajo de este valor se marca para reponer.</div>
        </div>
      </div>

      {/* ---- Imagen ---- */}
      <div className="form-group" style={{ marginBottom: '0.4rem' }}><label>Imagen del producto</label></div>
      <div className="image-field">
        <ProductoImagen producto={vistaPrevia} size="lg" />
        <div className="image-field-actions">
          <input ref={inputArchivo} type="file" accept="image/*" hidden onChange={onArchivo} />
          <button type="button" className="btn btn-dark btn-sm" onClick={() => inputArchivo.current?.click()}>
            Subir foto desde el equipo
          </button>
          <input className="form-control" placeholder="o pega la URL de la imagen (https://...)" value={urlManual}
            onChange={(e) => { setUrlManual(e.target.value); set('imagen_url', e.target.value.trim()) }} />
          {form.imagen_url && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { set('imagen_url', ''); setUrlManual('') }}>
              Quitar imagen
            </button>
          )}
          <p className="image-field-hint">JPG o PNG. La foto se ajusta automáticamente a 600 px para que cargue rápido.</p>
        </div>
      </div>

      <label className="checkbox-item boxed">
        <input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} />
        <span>Producto activo (visible para la venta en tienda)</span>
      </label>
    </Modal>
  )
}
