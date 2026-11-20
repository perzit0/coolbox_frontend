import { useEffect, useMemo, useState } from 'react'
import { promocionesApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import ProductoImagen from '../../components/ProductoImagen'
import { fechaHora, money, ZONA_HORARIA } from '../../utils/format'

const ESTADOS = {
  vigente: ['Vigente', 'badge-green'], programada: ['Programada', 'badge-blue'],
  vencida: ['Vencida', 'badge-gray'], desactivada: ['Desactivada', 'badge-red'],
}
const CANAL = { todos: 'Online y cajas', online: 'Solo online', tienda: 'Solo cajas' }

/** Fecha y hora local (Lima) para un <input type="datetime-local">. */
function local(d) {
  const x = new Date(d)
  const lima = new Date(x.toLocaleString('en-US', { timeZone: ZONA_HORARIA }))
  const p = (n) => String(n).padStart(2, '0')
  return `${lima.getFullYear()}-${p(lima.getMonth() + 1)}-${p(lima.getDate())}T${p(lima.getHours())}:${p(lima.getMinutes())}`
}

function nuevaDesdePreset(preset) {
  const ahora = new Date()
  const fin = new Date(ahora.getTime() + 7 * 864e5)
  fin.setHours(23, 59, 0, 0)
  return {
    tipo: preset.tipo, preset: preset.id, nombre: preset.tipo === 'NXM' ? `${preset.nombre} en ` : '',
    descripcion: '', valor: preset.tipo === 'MONTO' ? 50 : preset.tipo === 'CUPON' ? 10 : preset.tipo === 'SEGUNDA_UNIDAD' ? 50 : 15,
    lleva: preset.lleva || (preset.tipo === 'VOLUMEN' ? 2 : ''), paga: preset.paga || '', codigo_cupon: '', monto_minimo: '',
    patrocinador: '', alcance: preset.tipo === 'CUPON' ? 'todo' : 'productos', marca_id: '', familia_id: '',
    canal: preset.tipo === 'CUPON' ? 'online' : 'todos', fecha_inicio: local(ahora), fecha_fin: local(fin), destacada: false, productos: [],
  }
}

function SelectorProductos({ form, setForm, conPrecio }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState([])
  useEffect(() => {
    const t = setTimeout(() => promocionesApi.productos({ q }).then((r) => setRes(r.productos)).catch(() => {}), 250)
    return () => clearTimeout(t)
  }, [q])
  const elegidos = new Set(form.productos.map((p) => p.producto_id))
  const agregar = (p) => setForm((f) => ({ ...f, productos: [...f.productos, { producto_id: p.id, sku: p.sku, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url, precio_especial: conPrecio ? Math.round(p.precio * 0.85) : null }] }))
  const quitar = (id) => setForm((f) => ({ ...f, productos: f.productos.filter((x) => x.producto_id !== id) }))
  const precio = (id, v) => setForm((f) => ({ ...f, productos: f.productos.map((x) => (x.producto_id === id ? { ...x, precio_especial: v } : x)) }))
  return (
    <div className="promo-productos">
      <div className="promo-buscar">
        <Icon name="search" size={16} />
        <input className="form-control" placeholder="Buscar por nombre o SKU" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="promo-resultados">
        {res.filter((p) => !elegidos.has(p.id)).slice(0, 8).map((p) => (
          <button type="button" key={p.id} className="promo-res" onClick={() => agregar(p)}>
            <ProductoImagen producto={p} size="xs" /><span>{p.nombre}</span><small>{p.sku} · {money(p.precio)}</small><Icon name="plus" size={14} />
          </button>
        ))}
      </div>
      {form.productos.length > 0 && (
        <table className="data-table compact">
          <thead><tr><th>Producto</th><th className="num">Precio</th>{conPrecio && <th className="num">Precio promo</th>}<th /></tr></thead>
          <tbody>
            {form.productos.map((p) => (
              <tr key={p.producto_id}>
                <td><b className="mono">{p.sku}</b> {p.nombre}</td>
                <td className="num">{money(p.precio)}</td>
                {conPrecio && (
                  <td className="num">
                    <input className="form-control input-precio" type="number" step="0.10" min="0.1" value={p.precio_especial ?? ''} onChange={(e) => precio(p.producto_id, e.target.value)} />
                    {p.precio_especial > 0 && p.precio_especial < p.precio && <small className="pos"> -{Math.round((1 - p.precio_especial / p.precio) * 100)}%</small>}
                  </td>
                )}
                <td><button type="button" className="btn btn-ghost btn-icon" onClick={() => quitar(p.producto_id)} aria-label="Quitar"><Icon name="x" size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function FormPromocion({ inicial, tipos, onClose, onGuardada }) {
  const fb = useFeedback()
  const [form, setForm] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const t = form.tipo
  const tipoInfo = tipos.tipos.find((x) => x.codigo === t)
  const vista = useMemo(() => {
    if (t === 'NXM') return `${form.lleva}x${form.paga}`
    if (t === 'PORCENTAJE') return `-${form.valor}%`
    if (t === 'MONTO') return `S/ ${form.valor} menos`
    if (t === 'SEGUNDA_UNIDAD') return `2.ª unid. -${form.valor}%`
    if (t === 'VOLUMEN') return `Desde ${form.lleva} unid. -${form.valor}%`
    if (t === 'CUPON') return `Cupón ${form.codigo_cupon || '…'} -${form.valor}%`
    return 'Precio especial'
  }, [form, t])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const payload = {
        ...form, marca_id: form.marca_id || null, familia_id: form.familia_id || null,
        productos: form.productos.map((p) => ({ producto_id: p.producto_id, precio_especial: p.precio_especial })),
      }
      const r = form.id ? await promocionesApi.editar(form.id, payload) : await promocionesApi.crear(payload)
      fb.ok(r.mensaje)
      onGuardada()
    } catch (err) { fb.error(err.detail) } finally { setGuardando(false) }
  }

  return (
    <Modal as="form" onSubmit={guardar} size="lg" onClose={onClose}
      titulo={form.id ? 'Editar promoción' : `Nueva promoción: ${tipoInfo?.nombre}`} subtitulo={tipoInfo?.descripcion}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar promoción'}</button>
      </>}>
      <div className="promo-preview"><span className={`promo-chip t-${t.toLowerCase()}`}>{vista}</span>
        <span>{form.nombre || 'Nombre de la promoción'}</span>
        {form.patrocinador && <small>Auspicia {form.patrocinador}</small>}
        <small className="muted">Válido hasta el {form.fecha_fin ? new Date(form.fecha_fin).toLocaleDateString('es-PE') : '…'}</small></div>

      <div className="form-grid-2">
        <div className="form-group"><label>Nombre (lo ve el cliente)</label><input className="form-control" required minLength={3} maxLength={120} value={form.nombre} onChange={set('nombre')} placeholder="Ej.: 2x1 en cargadores Apple" /></div>
        <div className="form-group"><label>Marca o empresa que auspicia (opcional)</label><input className="form-control" maxLength={80} value={form.patrocinador || ''} onChange={set('patrocinador')} placeholder="Ej.: Samsung, Epson, Alicorp" /></div>
      </div>
      <div className="form-group"><label>Descripción corta</label><input className="form-control" maxLength={300} value={form.descripcion || ''} onChange={set('descripcion')} /></div>

      <div className="form-grid-3">
        {t === 'NXM' && (<>
          <div className="form-group"><label>Lleva (unidades)</label><input className="form-control" type="number" min="2" max="10" required value={form.lleva} onChange={set('lleva')} /></div>
          <div className="form-group"><label>Paga (unidades)</label><input className="form-control" type="number" min="1" max="9" required value={form.paga} onChange={set('paga')} /></div>
        </>)}
        {['PORCENTAJE', 'SEGUNDA_UNIDAD', 'VOLUMEN', 'CUPON'].includes(t) && (
          <div className="form-group"><label>{t === 'SEGUNDA_UNIDAD' ? '% de descuento en la 2.ª unidad' : '% de descuento'}</label><input className="form-control" type="number" min="1" max="90" required value={form.valor} onChange={set('valor')} /></div>
        )}
        {t === 'MONTO' && <div className="form-group"><label>Soles de descuento por unidad</label><input className="form-control" type="number" min="1" step="0.10" required value={form.valor} onChange={set('valor')} /></div>}
        {t === 'VOLUMEN' && <div className="form-group"><label>Desde cuántas unidades</label><input className="form-control" type="number" min="2" max="50" required value={form.lleva} onChange={set('lleva')} /></div>}
        {t === 'CUPON' && (<>
          <div className="form-group"><label>Código del cupón</label><input className="form-control mono" required value={form.codigo_cupon || ''} onChange={(e) => setForm({ ...form, codigo_cupon: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} placeholder="NAVIDAD15" /></div>
          <div className="form-group"><label>Compra mínima S/ (opcional)</label><input className="form-control" type="number" min="0" value={form.monto_minimo || ''} onChange={set('monto_minimo')} /></div>
        </>)}
      </div>

      <div className="form-grid-3">
        <div className="form-group"><label>Inicio</label><input className="form-control" type="datetime-local" required value={form.fecha_inicio} onChange={set('fecha_inicio')} /></div>
        <div className="form-group"><label>Fin (se muestra al cliente)</label><input className="form-control" type="datetime-local" required min={form.fecha_inicio} value={form.fecha_fin} onChange={set('fecha_fin')} /></div>
        <div className="form-group"><label>Dónde aplica</label>
          <select className="form-control" value={form.canal} onChange={set('canal')} disabled={t === 'CUPON'}>
            {tipos.canales.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
          </select></div>
      </div>
      <div className="chip-row">
        {[['1 semana', 7], ['15 días', 15], ['1 mes', 30], ['Fin de mes', 'fm']].map(([l, d]) => (
          <button type="button" key={l} className="chip" onClick={() => {
            const ini = new Date(form.fecha_inicio)
            const fin = d === 'fm' ? new Date(ini.getFullYear(), ini.getMonth() + 1, 0, 23, 59) : new Date(ini.getTime() + d * 864e5)
            if (d !== 'fm') fin.setHours(23, 59, 0, 0)
            setForm({ ...form, fecha_fin: local(fin) })
          }}>Vigencia: {l}</button>
        ))}
      </div>

      {t !== 'CUPON' && (
        <>
          <div className="form-group"><label>¿A qué productos aplica?</label>
            <div className="segmented">
              {[['productos', 'Productos elegidos'], ['marca', 'Toda una marca'], ['familia', 'Toda una familia'], ['todo', 'Todo el catálogo']]
                .filter(([k]) => t !== 'PRECIO_ESPECIAL' || k === 'productos')
                .map(([k, l]) => <button type="button" key={k} className={form.alcance === k ? 'active' : ''} onClick={() => setForm({ ...form, alcance: k })}>{l}</button>)}
            </div>
          </div>
          {form.alcance === 'marca' && (
            <div className="form-group"><label>Marca</label><select className="form-control" required value={form.marca_id || ''} onChange={set('marca_id')}>
              <option value="">Elige la marca</option>{tipos.marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
          )}
          {form.alcance === 'familia' && (
            <div className="form-group"><label>Familia</label><select className="form-control" required value={form.familia_id || ''} onChange={set('familia_id')}>
              <option value="">Elige la familia</option>{tipos.familias.map((m) => <option key={m.id} value={m.id}>{m.codigo} · {m.nombre}</option>)}</select></div>
          )}
          {form.alcance === 'productos' && <SelectorProductos form={form} setForm={setForm} conPrecio={t === 'PRECIO_ESPECIAL'} />}
        </>
      )}
      <label className="check-row"><input type="checkbox" checked={!!form.destacada} onChange={set('destacada')} /> Mostrar en el carrusel principal de la tienda online</label>
    </Modal>
  )
}

export default function Promociones() {
  const fb = useFeedback()
  const [tipos, setTipos] = useState(null)
  const [datos, setDatos] = useState(null)
  const [estado, setEstado] = useState('')
  const [elegir, setElegir] = useState(false)
  const [form, setForm] = useState(null)

  const cargar = () => promocionesApi.listar().then(setDatos).catch((e) => fb.error(e.detail))
  useEffect(() => {
    promocionesApi.tipos().then(setTipos).catch((e) => fb.error(e.detail))
    cargar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const editar = async (id) => {
    try {
      const { promocion: p } = await promocionesApi.obtener(id)
      setForm({ ...p, fecha_inicio: local(p.fecha_inicio), fecha_fin: local(p.fecha_fin), marca_id: p.marca_id || '', familia_id: p.familia_id || '',
        valor: p.valor ?? '', lleva: p.lleva ?? '', paga: p.paga ?? '', monto_minimo: p.monto_minimo ?? '',
        productos: p.productos.map((x) => ({ ...x, precio: x.precio })) })
    } catch (e) { fb.error(e.detail) }
  }
  const alternar = async (p) => {
    try { const r = await promocionesApi.cambiarEstado(p.id, !p.activa); fb.ok(r.mensaje); cargar() } catch (e) { fb.error(e.detail) }
  }
  const lista = (datos?.promociones || []).filter((p) => !estado || p.estado === estado)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Promociones</h1>
          <p className="page-subtitle">Crea promociones con vigencia para la tienda online y las cajas: 2x1, 3x1, descuentos, precio especial, cupones y más.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setElegir(true)} disabled={!tipos}><Icon name="plus" /> Nueva promoción</button>
      </div>

      {datos && (
        <div className="segmented filtro-estado">
          <button type="button" className={!estado ? 'active' : ''} onClick={() => setEstado('')}>Todas ({datos.promociones.length})</button>
          {Object.entries(ESTADOS).map(([k, [l]]) => (
            <button type="button" key={k} className={estado === k ? 'active' : ''} onClick={() => setEstado(k)}>{l} ({datos.resumen[k] || 0})</button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="table-wrapper flat">
          <table className="data-table">
            <thead><tr><th>Promoción</th><th>Tipo</th><th>Aplica a</th><th>Canal</th><th>Vigencia</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {!datos ? <tr><td colSpan="7" className="empty-cell">Cargando…</td></tr>
                : lista.length === 0 ? <tr><td colSpan="7" className="empty-cell">No hay promociones en este estado.</td></tr>
                  : lista.map((p) => (
                    <tr key={p.id} className={p.estado === 'vencida' || p.estado === 'desactivada' ? 'fila-apagada' : ''}>
                      <td>
                        <b>{p.nombre}</b>{p.destacada && <span className="badge badge-black" style={{ marginLeft: 6 }}>Carrusel</span>}
                        {p.patrocinador && <div className="muted small">Auspicia {p.patrocinador}</div>}
                      </td>
                      <td><span className={`promo-chip t-${p.tipo.toLowerCase()}`}>{p.etiqueta}</span></td>
                      <td>{p.alcance === 'productos' ? `${p.cantidad_productos} producto(s)` : p.alcance === 'marca' ? `Marca ${p.marca}` : p.alcance === 'familia' ? `Familia ${p.familia}` : p.tipo === 'CUPON' ? 'Toda la compra' : 'Todo el catálogo'}</td>
                      <td>{CANAL[p.canal]}</td>
                      <td className="small">{fechaHora(p.fecha_inicio)}<br />al {fechaHora(p.fecha_fin)}</td>
                      <td><span className={`badge ${ESTADOS[p.estado][1]}`}>{ESTADOS[p.estado][0]}</span></td>
                      <td className="acciones-fila">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => editar(p.id)}><Icon name="edit" size={14} /> Editar</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => alternar(p)}>{p.activa ? 'Desactivar' : 'Activar'}</button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {elegir && tipos && (
        <Modal titulo="¿Qué tipo de promoción quieres crear?" subtitulo="Elige un tipo; luego defines los productos y su tiempo de validez." size="lg" onClose={() => setElegir(false)}>
          <div className="presets">
            {tipos.presets.map((p) => (
              <button type="button" key={p.id} className="preset" onClick={() => { setElegir(false); setForm(nuevaDesdePreset(p)) }}>
                <span className={`promo-chip t-${p.tipo.toLowerCase()}`}>{p.nombre}</span>
                <small>{p.descripcion}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {form && tipos && <FormPromocion inicial={form} tipos={tipos} onClose={() => setForm(null)} onGuardada={() => { setForm(null); cargar() }} />}
    </>
  )
}
