import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/client'

/** Ingreso del personal de tienda. Redirige a selección de rol. */
export default function LoginUsuario({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const result = await authApi.loginUsuario(email, password)
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
          <span className="hero-brand-name">Sistema de Tienda</span>
        </div>
        <div className="hero-content">
          <p className="hero-eyebrow">Personal de Tienda</p>
          <h1>Bienvenido de vuelta</h1>
          <p>Ingresa con el correo que recibiste del administrador. Al iniciar sesión podrás elegir el rol con el que trabajarás durante tu turno.</p>
        </div>
        <div className="hero-features">
          <div className="hero-feature">Registro rápido de ventas en tienda</div>
          <div className="hero-feature">Consulta de stock y catálogo actualizado</div>
          <div className="hero-feature">Historial de ventas del día</div>
        </div>
      </aside>

      <section className="login-form-side">
        <div className="login-form-card">
          <h2>Ingreso de Usuario</h2>
          <p className="subtitle">Personal de tienda: vendedores, cajeros, almaceneros y supervisores.</p>

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
              {sending ? <span className="spinner" /> : 'Ingresar al sistema'}
            </button>
          </form>

          <div className="login-switcher">
            ¿Eres administrador? <Link to="/login-admin">Ingresar al Panel Administrativo</Link>
          </div>

          <div className="demo-credentials">
            <div className="demo-credentials-title">Credenciales de prueba</div>
            <div className="demo-cred-row">
              <span
                className="demo-clickable"
                onClick={() => { setEmail('jperezl@coolbox.com.pe'); setPassword('Vendedor123!') }}
              >
                jperezl@coolbox.com.pe
              </span>
              <span>Vendedor123!</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
