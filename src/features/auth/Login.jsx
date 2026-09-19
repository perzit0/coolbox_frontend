import { useState } from 'react'
import { authApi } from '../../api/client'

const DEMO = [
  { email: 'admin@coolbox.com.pe', password: 'Admin123!', rol: 'Administrador' },
  { email: 'jperezl@coolbox.com.pe', password: 'Vendedor123!', rol: 'Vendedor' },
  { email: 'mtorresr@coolbox.com.pe', password: 'Supervisor123!', rol: 'Supervisor de Ventas' },
]

/** Ingreso único para todo el personal. El rol (incluido Administrador)
 * se define después, en la pantalla de selección de rol. */
export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const result = await authApi.login(email, password)
      onSuccess(result)
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
          <div className="hero-feature">Ventas, catálogo, stock y reportes en un solo lugar</div>
        </div>
      </aside>

      <section className="login-form-side">
        <div className="login-form-card">
          <h2>Iniciar sesión</h2>
          <p className="subtitle">Administradores, vendedores, almaceneros y supervisores de ventas.</p>

          <form onSubmit={submit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Correo institucional</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@coolbox.com.pe"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={sending}>
              {sending ? <span className="spinner" /> : 'Ingresar'}
            </button>
          </form>

          <div className="demo-credentials">
            <div className="demo-credentials-title">Credenciales de prueba</div>
            {DEMO.map((d) => (
              <div className="demo-cred-row" key={d.email}>
                <span className="demo-clickable" onClick={() => { setEmail(d.email); setPassword(d.password) }}>
                  {d.email}
                </span>
                <span>{d.rol}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
