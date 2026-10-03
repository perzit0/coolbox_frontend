import { useState } from 'react'
import { authApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import { NuevaPasswordFields, PasswordInput, passwordValida } from '../../components/PasswordFields'
import { fecha, fechaHora } from '../../utils/format'

/** Panel "Mi cuenta": datos personales y cambio de contraseña propio. */
export default function MiCuenta({ sesion, onUsuario }) {
  const { usuario, rol_activo } = sesion
  const fb = useFeedback()
  const [perfil, setPerfil] = useState({ telefono: usuario.telefono || '', direccion: usuario.direccion || '' })
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [guardandoPw, setGuardandoPw] = useState(false)

  async function guardarPerfil(e) {
    e.preventDefault()
    setGuardandoPerfil(true)
    try {
      const r = await authApi.actualizarPerfil(perfil)
      onUsuario(r.usuario)
      fb.ok('Datos de contacto actualizados.')
    } catch (err) {
      fb.error(err.detail)
    } finally { setGuardandoPerfil(false) }
  }

  async function cambiarPassword(e) {
    e.preventDefault()
    setGuardandoPw(true)
    try {
      await authApi.cambiarPassword(actual, nueva)
      setActual(''); setNueva(''); setConfirmacion('')
      fb.ok('Contraseña actualizada correctamente.')
    } catch (err) {
      fb.error(err.detail)
    } finally { setGuardandoPw(false) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi cuenta</h1>
          <p className="page-subtitle">Tus datos, roles asignados y seguridad de acceso.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Datos personales</h3></div>
          <dl className="data-list">
            <dt>Nombre completo</dt><dd>{usuario.nombre_completo}</dd>
            <dt>DNI</dt><dd>{usuario.dni}</dd>
            <dt>Correo institucional</dt><dd className="mono">{usuario.email}</dd>
            <dt>Fecha de ingreso</dt><dd>{fecha(usuario.fecha_ingreso)}</dd>
            <dt>Último acceso</dt><dd>{fechaHora(usuario.ultimo_acceso)}</dd>
            <dt>Rol activo</dt><dd><span className="badge badge-red">{rol_activo?.nombre}</span></dd>
            <dt>Roles asignados</dt>
            <dd className="actions-inline">{usuario.roles.map((r) => <span key={r.id} className="badge badge-black">{r.nombre}</span>)}</dd>
          </dl>
          <form onSubmit={guardarPerfil} className="subform">
            <div className="form-row">
              <div className="form-group">
                <label>Celular</label>
                <input className="form-control" inputMode="numeric" maxLength={9} value={perfil.telefono}
                  onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input className="form-control" maxLength={200} value={perfil.direccion}
                  onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })} />
              </div>
            </div>
            <p className="form-help">El nombre, DNI y correo solo los modifica el administrador.</p>
            <button type="submit" className="btn btn-outline" disabled={guardandoPerfil}>
              {guardandoPerfil ? <span className="spinner spinner-dark" /> : 'Guardar datos de contacto'}
            </button>
          </form>
        </div>

        <form className="card" onSubmit={cambiarPassword}>
          <div className="card-header"><h3 className="card-title">Cambiar contraseña</h3></div>
          <div className="form-group">
            <label htmlFor="mc-actual">Contraseña actual</label>
            <PasswordInput id="mc-actual" value={actual} onChange={setActual} autoComplete="current-password" />
          </div>
          <NuevaPasswordFields nueva={nueva} setNueva={setNueva} confirmacion={confirmacion}
            setConfirmacion={setConfirmacion} dni={usuario.dni} />
          <button type="submit" className="btn btn-primary"
            disabled={guardandoPw || !actual || !passwordValida(nueva, confirmacion, usuario.dni)}>
            {guardandoPw ? <span className="spinner" /> : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </>
  )
}
