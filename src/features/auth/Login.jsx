import { useState } from 'react'
import { authApi } from '../../api/client'
import Icon from '../../components/Icon'
import { PasswordInput } from '../../components/PasswordFields'

const DEMO = [
  { email: 'admin@coolbox.com.pe', password: 'Admin123!', rol: 'Administrador' },
  { email: 'jperezl@coolbox.com.pe', password: 'Vendedor123!', rol: 'Vendedor / Almacenero' },
  { email: 'mtorresr@coolbox.com.pe', password: 'Supervisor123!', rol: 'Supervisor de Ventas' },
]

/** Ingreso único para todo el personal. El rol (incluido Administrador)
 * se define después, en la pantalla de selección de rol. */
export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [verDemo, setVerDemo] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      onSuccess(await authApi.login(email.trim(), password))
    } catch (err) {
      setError(err.detail || 'No fue posible iniciar sesión.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero hero-black">
        <div className="hero-brand">
          <span className="hero-brand-mark">COOLBOX</span>
          <span className="hero-brand-name">Sistema de Gestión de Tienda</span>
        </div>
        <div className="hero-content">
          <p className="hero-eyebrow">Personal Coolbox</p>
          <h1>Bienvenido de vuelta</h1>
          <p>
            Ingresa con tu correo institucional. Si tienes más de un rol asignado,
            elegirás con cuál trabajar en esta sesión.
          </p>
        </div>
        <div className="hero-features">
          <div className="hero-feature">Un solo acceso para todo el personal</div>
          <div className="hero-feature">Cada rol habilita solo sus propias opciones</div>
          <div className="hero-feature">Ventas, catálogo con SKU, kardex y reportes en un solo lugar</div>
        </div>
      </aside>

      <section className="login-form-side">
        <div className="login-form-card">
          <h2>Iniciar sesión</h2>
          <p className="subtitle">Administradores, vendedores, almaceneros y supervisores de ventas.</p>

          <form onSubmit={submit} noValidate>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="login-email">Correo institucional</label>
              <input id="login-email" type="email" className="form-control" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="nombre@coolbox.com.pe"
                autoComplete="username" autoFocus required />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Contraseña</label>
              <PasswordInput id="login-password" value={password} onChange={setPassword}
                placeholder="Ingrese su contraseña" autoComplete="current-password" />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={sending || !email || !password}>
              {sending ? <span className="spinner" /> : 'Ingresar'}
            </button>
          </form>

          <p className="login-help">
            <Icon name="info" size={14} /> ¿Olvidaste tu contraseña? Solicita al administrador que la restablezca.
          </p>

          <div className="demo-credentials">
            <button type="button" className="demo-toggle" onClick={() => setVerDemo((v) => !v)}>
              Credenciales de prueba <Icon name={verDemo ? 'chevronLeft' : 'chevronRight'} size={14} />
            </button>
            {verDemo && DEMO.map((d) => (
              <div className="demo-cred-row" key={d.email}>
                <button type="button" className="demo-clickable" onClick={() => { setEmail(d.email); setPassword(d.password) }}>
                  {d.email}
                </button>
                <span>{d.rol}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
