import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/client'

/** Ingreso exclusivo del administrador. */
export default function LoginAdmin({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const result = await authApi.loginAdmin(email, password)
      onSuccess(result)
    } catch (err) {
      setError(err.detail || 'No fue posible iniciar sesión.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero hero-red">
        <div className="hero-brand on-red">
          <span className="hero-brand-mark">COOLBOX</span>
          <span className="hero-brand-name" style={{ color: 'rgba(255,255,255,0.9)' }}>Panel Administrativo</span>
        </div>
        <div className="hero-content">
          <p className="hero-eyebrow">Acceso Restringido</p>
          <h1>Administra tu tienda</h1>
          <p>Este panel es exclusivo para administradores. Desde aquí puedes registrar personal, gestionar el catálogo, controlar el stock y ver los reportes del negocio.</p>
        </div>
        <div className="hero-features">
          <div className="hero-feature">Alta de usuarios con generación automática de correo</div>
          <div className="hero-feature">Asignación de roles y permisos por usuario</div>
          <div className="hero-feature">Reportes de ventas y control de inventario</div>
        </div>
      </aside>

      <section className="login-form-side">
        <div className="login-form-card">
          <h2>Ingreso Administrador</h2>
          <p className="subtitle">Acceso exclusivo al panel de gestión de Coolbox.</p>

          <form onSubmit={submit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Correo administrador</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@coolbox.com.pe"
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

            <button type="submit" className="btn btn-dark btn-block btn-lg" disabled={sending}>
              {sending ? <span className="spinner" /> : 'Ingresar al Panel'}
            </button>
          </form>

          <div className="login-switcher">
            ¿Eres personal de tienda? <Link to="/login">Ingresar como Usuario</Link>
          </div>

          <div className="demo-credentials">
            <div className="demo-credentials-title">Credenciales de prueba</div>
            <div className="demo-cred-row">
              <span
                className="demo-clickable"
                onClick={() => { setEmail('admin@coolbox.com.pe'); setPassword('Admin123!') }}
              >
                admin@coolbox.com.pe
              </span>
              <span>Admin123!</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
