import { useEffect, useState } from 'react'
import { usuariosApi } from '../../api/client'
import Modal from '../../components/Modal'

/** Modal para registrar/editar usuarios.
 * El correo NO se edita manualmente: se genera automáticamente al crear
 * a partir del primer nombre y los apellidos (el backend resuelve duplicados).
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
  })
  const [emailPreview, setEmailPreview] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const toggleRol = (id) => setForm((f) => ({
    ...f,
    roles_ids: f.roles_ids.includes(id) ? f.roles_ids.filter((x) => x !== id) : [...f.roles_ids, id],
  }))

  // Vista previa real del correo (consulta duplicados en el servidor)
  useEffect(() => {
    if (!esNuevo) return
    const { nombres, apellido_paterno, apellido_materno } = form
    if (!nombres.trim() || !apellido_paterno.trim()) { setEmailPreview(''); return }
    const t = setTimeout(() => {
      usuariosApi.previewEmail({ nombres, apellido_paterno, apellido_materno })
        .then((r) => setEmailPreview(r.email || ''))
        .catch(() => setEmailPreview(''))
    }, 350)
    return () => clearTimeout(t)
  }, [esNuevo, form.nombres, form.apellido_paterno, form.apellido_materno])

  const dniValido = /^\d{8}$/.test(form.dni)
  const telValido = !form.telefono || /^9\d{8}$/.test(form.telefono)

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (esNuevo && !dniValido) { setError('El DNI debe tener exactamente 8 dígitos.'); return }
    if (!telValido) { setError('El celular debe tener 9 dígitos y empezar con 9.'); return }
    if (form.roles_ids.length === 0) { setError('Debe asignar al menos un rol.'); return }
    setSending(true)
    try {
      const { dni, ...resto } = form
      const respuesta = esNuevo ? await usuariosApi.crear(form) : await usuariosApi.editar(usuario.id, resto)
      onGuardado(respuesta)
    } catch (err) {
      setError(err.detail || 'No fue posible guardar el usuario.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal as="form" onSubmit={guardar} size="lg" onClose={onClose}
      titulo={esNuevo ? 'Registrar nuevo usuario' : `Editar: ${usuario.nombre_completo}`}
      subtitulo={esNuevo ? 'Toma los datos del colaborador; el correo y la contraseña temporal se generan al guardar.' : usuario.email}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? <span className="spinner" /> : esNuevo ? 'Registrar usuario' : 'Guardar cambios'}
          </button>
        </>
      )}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label>DNI</label>
          <input className="form-control" value={form.dni} inputMode="numeric" maxLength={8} required disabled={!esNuevo}
            onChange={(e) => set('dni', e.target.value.replace(/\D/g, ''))} placeholder="8 dígitos" />
          {esNuevo && form.dni && !dniValido && <div className="form-error">Debe tener 8 dígitos.</div>}
        </div>
        <div className="form-group">
          <label>Celular</label>
          <input className="form-control" value={form.telefono} inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX"
            onChange={(e) => set('telefono', e.target.value.replace(/\D/g, ''))} />
          {!telValido && <div className="form-error">9 dígitos, empieza con 9.</div>}
        </div>
      </div>

      <div className="form-group">
        <label>Nombres</label>
        <input className="form-control" value={form.nombres} onChange={(e) => set('nombres', e.target.value)}
          placeholder="Ej: Juan Daniel" required maxLength={120} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Apellido paterno</label>
          <input className="form-control" value={form.apellido_paterno} required maxLength={80}
            onChange={(e) => set('apellido_paterno', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Apellido materno</label>
          <input className="form-control" value={form.apellido_materno} required maxLength={80}
            onChange={(e) => set('apellido_materno', e.target.value)} />
        </div>
      </div>

      {esNuevo && (
        <div className="alert alert-info">
          <strong>Correo institucional:</strong>{' '}
          <span className="mono">{emailPreview || '(se calcula al ingresar nombres y apellidos)'}</span>
          <div className="form-help">Inicial del primer nombre + apellido paterno + inicial del materno. Si ya existe, se agrega un número.</div>
        </div>
      )}

      <div className="form-group">
        <label>Dirección</label>
        <input className="form-control" value={form.direccion} maxLength={200} onChange={(e) => set('direccion', e.target.value)} />
      </div>

      <div className="form-group">
        <label>Roles asignados</label>
        <div className="role-check-grid">
          {roles.map((r) => (
            <label key={r.id} className={`role-check ${form.roles_ids.includes(r.id) ? 'checked' : ''}`}>
              <input type="checkbox" checked={form.roles_ids.includes(r.id)} onChange={() => toggleRol(r.id)} />
              <span>
                <strong>{r.nombre}</strong>
                <small>{r.descripcion}</small>
              </span>
            </label>
          ))}
        </div>
        <div className="form-help">Un usuario puede tener varios roles. Al iniciar sesión elegirá con cuál trabajar.</div>
      </div>
    </Modal>
  )
}
