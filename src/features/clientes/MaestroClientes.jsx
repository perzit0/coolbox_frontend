import { useEffect, useState } from 'react'
import { maestroClientesApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { fechaHora } from '../../utils/format'

export const ORIGEN_CLIENTE = {
  caja: ['Caja', 'badge-black'],
  tienda: ['Tienda online', 'badge-blue'],
  manual: ['Registro manual', 'badge-gray'],
  integracion: ['Integración', 'badge-orange'],
}
const TIPOS = ['DNI', 'CE', 'RUC', 'PASAPORTE']
const LARGO = { DNI: 8, RUC: 11, CE: 12, PASAPORTE: 12 }
const vacio = { tipo_documento: 'DNI', nro_documento: '', nombres: '', apellidos: '', razon_social: '', email: '', telefono: '', direccion: '' }

function ClienteForm({ cliente, onClose, onSaved }) {
  const fb = useFeedback()
  const [f, setF] = useState(cliente ? { ...vacio, ...Object.fromEntries(Object.keys(vacio).map((k) => [k, cliente[k] || ''])) } : vacio)
  const [enviando, setEnviando] = useState(false)
  const esRuc = f.tipo_documento === 'RUC'
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const numero = (v) => (['DNI', 'RUC'].includes(f.tipo_documento) ? v.replace(/\D/g, '') : v.toUpperCase().replace(/[^A-Z0-9]/g, ''))

  async function guardar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = cliente ? await maestroClientesApi.editar(cliente.id, f) : await maestroClientesApi.crear(f)
      fb.ok(r.mensaje)
      onSaved(r.cliente)
    } catch (err) {
      fb.error(err.detail || 'No se pudo guardar el cliente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal as="form" onSubmit={guardar} onClose={onClose} titulo={cliente ? `Editar cliente ${cliente.clave}` : 'Nuevo cliente'}
      subtitulo="El tipo y número de documento identifican al cliente: no puede repetirse."
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={enviando}><Icon name="check" size={16} /> {enviando ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <div className="form-row">
        <div className="form-group">
          <label>Tipo de documento</label>
          <select className="form-control" value={f.tipo_documento} onChange={(e) => setF((x) => ({ ...x, tipo_documento: e.target.value, nro_documento: '' }))}>
            {TIPOS.map((t) => <option key={t} value={t}>{t === 'CE' ? 'Carné de extranjería' : t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Número</label>
          <input className="form-control mono" required maxLength={LARGO[f.tipo_documento]} value={f.nro_documento}
            onChange={(e) => set('nro_documento', numero(e.target.value))} />
        </div>
      </div>
      {esRuc ? (
        <div className="form-group">
          <label>Razón social</label>
          <input className="form-control" required maxLength={200} value={f.razon_social} onChange={(e) => set('razon_social', e.target.value)} />
        </div>
      ) : (
        <div className="form-row">
          <div className="form-group">
            <label>Nombres</label>
            <input className="form-control" required maxLength={120} value={f.nombres} onChange={(e) => set('nombres', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Apellidos</label>
            <input className="form-control" maxLength={160} value={f.apellidos} onChange={(e) => set('apellidos', e.target.value)} />
          </div>
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label>Correo (opcional)</label>
          <input className="form-control" type="email" maxLength={160} value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Teléfono (opcional)</label>
          <input className="form-control" inputMode="tel" maxLength={20} value={f.telefono} onChange={(e) => set('telefono', e.target.value.replace(/[^0-9+]/g, ''))} />
        </div>
      </div>
      <div className="form-group">
        <label>Dirección (opcional)</label>
        <input className="form-control" maxLength={240} value={f.direccion} onChange={(e) => set('direccion', e.target.value)} />
      </div>
    </Modal>
  )
}

/** Maestro de clientes: un registro por cliente (tipo + número de documento), venga de la caja,
 * de la tienda online, de un registro manual o de la integración con el grupo pareado. */
export default function MaestroClientes() {
  const fb = useFeedback()
  const [f, setF] = useState({ q: '', origen: '', activo: '1', pagina: 1 })
  const [datos, setDatos] = useState(null)
  const [resumen, setResumen] = useState([])
  const [form, setForm] = useState(null) // null | {} (nuevo) | cliente

  const cargar = () => {
    maestroClientesApi.listar({ ...f, por_pagina: 25 }).then(setDatos).catch((e) => fb.error(e.detail))
    maestroClientesApi.resumen().then((r) => setResumen(r.resumen)).catch(() => {})
  }
  useEffect(() => { const t = setTimeout(cargar, 200); return () => clearTimeout(t) }, [f]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarEstado = async (c) => {
    const ok = await fb.confirmar({
      titulo: `${c.activo ? 'Desactivar' : 'Activar'} a ${c.nombre_completo}`,
      mensaje: c.activo ? 'No se borra: deja de aparecer en la caja y en la API del otro grupo.' : 'Vuelve a estar disponible en la caja y en la API.',
      textoConfirmar: c.activo ? 'Desactivar' : 'Activar', peligro: c.activo,
    })
    if (!ok) return
    try {
      const r = await maestroClientesApi.cambiarEstado(c.id, !c.activo)
      fb.ok(r.mensaje); cargar()
    } catch (e) { fb.error(e.detail) }
  }
  const total = resumen.reduce((s, r) => s + r.activos, 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Maestro de clientes</h1>
          <p className="page-subtitle">Un registro por cliente, identificado por tipo y número de documento. Se completa solo con las ventas en caja, las cuentas de la tienda online y la integración.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Icon name="plus" /> Nuevo cliente</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-black">
          <p className="stat-label">Clientes activos</p>
          <p className="stat-value">{total}</p>
          <p className="stat-hint">Clave única: tipo + número de documento</p>
        </div>
        {Object.entries(ORIGEN_CLIENTE).map(([k, [label]]) => {
          const r = resumen.find((x) => x.origen === k)
          return (
            <div key={k} className="stat-card">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{r ? r.activos : 0}</p>
              <p className="stat-hint">{r && r.total !== r.activos ? `${r.total - r.activos} desactivados` : 'registrados desde aquí'}</p>
            </div>
          )
        })}
      </div>

      <div className="filter-bar">
        <div className="form-group compact" style={{ flex: 1 }}>
          <label>Buscar</label>
          <input className="form-control" placeholder="Documento, nombre, razón social o correo" value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value, pagina: 1 })} />
        </div>
        <div className="form-group compact">
          <label>Origen</label>
          <select className="form-control" value={f.origen} onChange={(e) => setF({ ...f, origen: e.target.value, pagina: 1 })}>
            <option value="">Todos</option>
            {Object.entries(ORIGEN_CLIENTE).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="form-group compact">
          <label>Estado</label>
          <select className="form-control" value={f.activo} onChange={(e) => setF({ ...f, activo: e.target.value, pagina: 1 })}>
            <option value="1">Activos</option><option value="0">Desactivados</option><option value="">Todos</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper flat">
          <table className="data-table">
            <thead><tr><th>Documento</th><th>Cliente</th><th>Contacto</th><th>Origen</th><th>Actualizado</th><th /></tr></thead>
            <tbody>
              {!datos ? <tr><td colSpan="6" className="empty-cell">Cargando…</td></tr>
                : datos.clientes.length === 0 ? <tr><td colSpan="6" className="empty-cell">No hay clientes con estos filtros.</td></tr>
                  : datos.clientes.map((c) => (
                    <tr key={c.id} className={c.activo ? '' : 'row-muted'}>
                      <td className="mono"><b>{c.tipo_documento}</b> {c.nro_documento}</td>
                      <td>{c.nombre_completo}{c.razon_social && (c.nombres || c.apellidos) ? <div className="cell-sub">{[c.nombres, c.apellidos].filter(Boolean).join(' ')}</div> : null}</td>
                      <td className="small">{c.email || <span className="muted">sin correo</span>}<div className="cell-sub">{c.telefono || ''}</div></td>
                      <td>
                        <span className={`badge ${(ORIGEN_CLIENTE[c.origen] || [])[1] || 'badge-gray'}`}>{(ORIGEN_CLIENTE[c.origen] || [c.origen])[0]}</span>
                        {c.origen_detalle && <div className="cell-sub">{c.origen_detalle}</div>}
                      </td>
                      <td className="small">{fechaHora(c.fecha_actualizacion)}</td>
                      <td>
                        <div className="actions-inline nowrap">
                          <button type="button" className="btn btn-ghost btn-icon" title="Editar" onClick={() => setForm(c)}><Icon name="edit" size={16} /></button>
                          <button type="button" className="btn btn-ghost btn-icon" title={c.activo ? 'Desactivar' : 'Activar'} onClick={() => cambiarEstado(c)}>
                            <Icon name={c.activo ? 'ban' : 'check'} size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {datos && <Pagination page={datos.pagina} pages={datos.total_paginas} total={datos.total} etiqueta="clientes" onChange={(p) => setF({ ...f, pagina: p })} />}
      </div>

      {form && <ClienteForm cliente={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); cargar() }} />}
    </>
  )
}
