import { useState } from 'react'
import { usuariosApi } from '../../api/client'

/** Modal para registrar/editar usuarios.
 * El correo NO se edita manualmente: se genera automáticamente al crear
 * a partir del primer nombre y los apellidos.
 */
export default function UsuarioForm({ roles, usuario, onClose, onGuardado }) {
  const esNuevo = !usuario
  const [form, setForm] = useState({
    dni: usuario?.dni || '',
    nombres: usuario?.nombres || '',
    apellido_paterno: usuario?.apellido_paterno || '',
    apellido_materno: usuario?.apellido_materno || '',
    telefono: usuario?.telefono || '',
    direccion: usuario?.direccion || '',
    roles_ids: usuario?.roles?.map((r) => r.id) || [],
    password: '',
    estado: usuario?.estado || 'activo',
  })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const toggleRol = (id) => setForm((f) => ({
    ...f,
    roles_ids: f.roles_ids.includes(id) ? f.roles_ids.filter((x) => x !== id) : [...f.roles_ids, id],
  }))

  // Vista previa del correo que se generará (frontend replica la regla)
  const emailPreview = (() => {
    const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toLowerCase()
    const primerNombre = norm((form.nombres || '').split(/\s+/)[0])
    const apPat = norm(form.apellido_paterno)
    const primerAM = norm((form.apellido_materno || '').split(/\s+/)[0])
    const local = `${primerNombre[0] || ''}${apPat}${primerAM[0] || ''}`
    if (!local) return ''
    return `${local}@coolbox.com.pe`
  })()

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (form.roles_ids.length === 0) { setError('Debe asignar al menos un rol.'); return }
    setSending(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      const respuesta = esNuevo
        ? await usuariosApi.crear(payload)
        : await usuariosApi.editar(usuario.id, payload)
      onGuardado(respuesta)
    } catch (err) {
      setError(err.detail || 'No fue posible guardar el usuario.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card large">
        <header className="modal-header">
          <h3>{esNuevo ? 'Registrar nuevo usuario' : `Editar: ${usuario.nombre_completo}`}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <form onSubmit={guardar}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label>DNI</label>
                <input
                  className="form-control"
                  value={form.dni}
                  onChange={(e) => set('dni', e.target.value)}
                  disabled={!esNuevo}
                  required
                  maxLength={15}
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  className="form-control"
                  value={form.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Nombres</label>
              <input
                className="form-control"
                value={form.nombres}
                onChange={(e) => set('nombres', e.target.value)}
                placeholder="Ej: Juan Daniel"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Apellido paterno</label>
                <input
                  className="form-control"
                  value={form.apellido_paterno}
                  onChange={(e) => set('apellido_paterno', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Apellido materno</label>
                <input
                  className="form-control"
                  value={form.apellido_materno}
                  onChange={(e) => set('apellido_materno', e.target.value)}
                  required
                />
              </div>
            </div>

            {esNuevo && (
              <div className="alert alert-info">
                <strong>Correo institucional:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{emailPreview || '(se calcula al ingresar los apellidos)'}</span>
                <div className="form-help" style={{ marginTop: 4 }}>
                  Se genera automáticamente. Si ya existe se agregará un número (ej: <code>{emailPreview.replace('@', '1@')}</code>).
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Dirección</label>
              <input
                className="form-control"
                value={form.direccion}
                onChange={(e) => set('direccion', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Roles asignados</label>
              <div className="checkbox-list">
                {roles.map((r) => (
                  <label key={r.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.roles_ids.includes(r.id)}
                      onChange={() => toggleRol(r.id)}
                    />
                    <span>
                      <strong>{r.nombre}</strong>
                      {r.es_admin && <span className="badge badge-red" style={{ marginLeft: 6 }}>Admin</span>}
                    </span>
                  </label>
                ))}
              </div>
              <div className="form-help">Un usuario puede tener varios roles. Al iniciar sesión elegirá uno.</div>
            </div>

            <div className="form-row">
              {!esNuevo && (
                <div className="form-group">
                  <label>Estado</label>
                  <select className="form-control" value={form.estado} onChange={(e) => set('estado', e.target.value)}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>{esNuevo ? 'Contraseña (opcional)' : 'Nueva contraseña (opcional)'}</label>
                <input
                  className="form-control"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder={esNuevo ? 'Si lo dejas vacío se genera una temporal' : 'Dejar en blanco para no cambiar'}
                  type="text"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? <span className="spinner" /> : esNuevo ? 'Registrar usuario' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
