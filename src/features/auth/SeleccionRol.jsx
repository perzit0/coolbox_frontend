import { useState } from 'react'
import { authApi } from '../../api/client'

/** Al iniciar sesión (o al pulsar "Cambiar rol") el usuario elige con qué
 * rol operará durante la sesión. El backend firma un nuevo JWT con el rol. */
export default function SeleccionRol({ usuario, onSuccess, onLogout }) {
  const [rolId, setRolId] = useState(usuario.roles?.[0]?.id || null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function confirmar() {
    if (!rolId) return
    setSending(true)
    setError('')
    try {
      const data = await authApi.seleccionarRol(rolId)
      onSuccess(data)
    } catch (err) {
      setError(err.detail || 'No fue posible activar el rol seleccionado.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="role-select-page">
      <div className="role-select-card">
        <h2>Selecciona tu rol</h2>
        <p className="subtitle">
          Hola <strong>{usuario.nombres} {usuario.apellido_paterno}</strong>. Elige el rol con el que vas a trabajar en esta sesión.
          Podrás cambiarlo más tarde desde la barra superior.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="role-grid">
          {usuario.roles.map((rol) => (
            <button
              key={rol.id}
              type="button"
              className={`role-option ${rolId === rol.id ? 'selected' : ''}`}
              onClick={() => setRolId(rol.id)}
            >
              <span className="role-name">{rol.nombre}</span>
              <span className="role-desc">{rol.descripcion}</span>
              <span className="role-permisos">
                {rol.permisos?.length || 0} permiso{(rol.permisos?.length || 0) === 1 ? '' : 's'}
              </span>
            </button>
          ))}
        </div>

        <div className="role-actions">
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            Cerrar sesión
          </button>
          <button type="button" className="btn btn-primary btn-lg" disabled={!rolId || sending} onClick={confirmar}>
            {sending ? <span className="spinner" /> : 'Activar rol y continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
