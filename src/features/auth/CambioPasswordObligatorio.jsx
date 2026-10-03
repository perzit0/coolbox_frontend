import { useState } from 'react'
import { authApi } from '../../api/client'
import { NuevaPasswordFields, PasswordInput, passwordValida } from '../../components/PasswordFields'

/** Primer ingreso (o tras un restablecimiento): la contraseña entregada por el
 * administrador es temporal y debe cambiarse antes de usar el sistema. */
export default function CambioPasswordObligatorio({ usuario, onSuccess, onLogout }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const r = await authApi.cambiarPassword(actual, nueva)
      onSuccess(r.usuario)
    } catch (err) {
      setError(err.detail)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="role-select-page">
      <form className="role-select-card narrow" onSubmit={guardar}>
        <h2>Crea tu contraseña</h2>
        <p className="subtitle">
          Hola <strong>{usuario.nombres}</strong>. Estás usando una contraseña temporal entregada por el administrador.
          Por seguridad, define una contraseña personal para continuar.
        </p>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="pw-actual">Contraseña temporal</label>
          <PasswordInput id="pw-actual" value={actual} onChange={setActual} autoComplete="current-password" autoFocus />
        </div>
        <NuevaPasswordFields nueva={nueva} setNueva={setNueva} confirmacion={confirmacion}
          setConfirmacion={setConfirmacion} dni={usuario.dni} />

        <div className="role-actions">
          <button type="button" className="btn btn-ghost" onClick={onLogout}>Cerrar sesión</button>
          <button type="submit" className="btn btn-primary btn-lg"
            disabled={sending || !actual || !passwordValida(nueva, confirmacion, usuario.dni)}>
            {sending ? <span className="spinner" /> : 'Guardar y continuar'}
          </button>
        </div>
      </form>
    </div>
  )
}
