import { useState } from 'react'
import { authApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import { NuevaPasswordFields, PasswordInput, passwordValida } from '../../components/PasswordFields'
import Icon from '../../components/Icon'
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

      {usuario.puede_autorizar && <PinCard usuario={usuario} onUsuario={onUsuario} />}
    </>
  )
}

/** PIN de autorización: el supervisor lo escribe en la caja del cajero para aprobar
 * anulaciones, descuentos, retiros y cierres con diferencia, sin que el cajero salga de su sesión. */
function PinCard({ usuario, onUsuario }) {
  const fb = useFeedback()
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [guardando, setGuardando] = useState(false)
  const valido = password && /^\d{6}$/.test(pin) && pin === pin2

  async function guardar(e) {
    e.preventDefault()
    if (!valido) return
    setGuardando(true)
    try {
      const r = await authApi.configurarPin(password, pin)
      onUsuario(r.usuario)
      setPassword(''); setPin(''); setPin2('')
      fb.ok('PIN de autorización actualizado.')
    } catch (err) { fb.error(err.detail) } finally { setGuardando(false) }
  }

  return (
    <form className="card" style={{ marginTop: '1.25rem', maxWidth: 560 }} onSubmit={guardar}>
      <div className="card-header">
        <h3 className="card-title"><Icon name="shield" /> PIN de autorización</h3>
        <span className={`badge ${usuario.tiene_pin ? 'badge-green' : 'badge-yellow'}`}>{usuario.tiene_pin ? 'Configurado' : 'Sin configurar'}</span>
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Lo escribes en la caja del cajero para autorizar anulaciones, descuentos, retiros de efectivo, reimpresiones
        y cierres con diferencia. Es personal: no lo compartas. Tras 3 intentos fallidos se bloquea 5 minutos.
      </p>
      <div className="form-row">
        <div className="form-group">
          <label>Nuevo PIN (6 dígitos)</label>
          <input className="form-control pin-input" type="password" inputMode="numeric" maxLength={6} autoComplete="off"
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="form-group">
          <label>Repite el PIN</label>
          <input className="form-control pin-input" type="password" inputMode="numeric" maxLength={6} autoComplete="off"
            value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
          {pin2 && pin !== pin2 && <div className="form-error">Los PIN no coinciden.</div>}
        </div>
      </div>
      <div className="form-group">
        <label>Tu contraseña (para confirmar)</label>
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
      </div>
      <button className="btn btn-primary" disabled={!valido || guardando}>
        {guardando ? <span className="spinner" /> : usuario.tiene_pin ? 'Cambiar PIN' : 'Crear PIN'}
      </button>
    </form>
  )
}
