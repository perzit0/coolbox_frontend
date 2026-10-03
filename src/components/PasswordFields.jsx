import { useState } from 'react'
import Icon from './Icon'

export function PasswordInput({ value, onChange, placeholder, autoComplete, autoFocus, id }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="input-group">
      <input id={id} type={visible ? 'text' : 'password'} className="form-control" value={value} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} required />
      <button type="button" className="input-addon" onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} tabIndex={-1}>
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  )
}

/** Reglas de la política de contraseñas (las mismas que valida el backend). */
export function reglasPassword(password, dni) {
  return [
    { ok: password.length >= 8, texto: 'Al menos 8 caracteres' },
    { ok: /[A-Za-z]/.test(password) && /\d/.test(password), texto: 'Combina letras y números' },
    { ok: !dni || password !== dni, texto: 'Distinta de tu DNI' },
  ]
}

/** Formulario de nueva contraseña + confirmación con indicadores de la política. */
export function NuevaPasswordFields({ nueva, setNueva, confirmacion, setConfirmacion, dni }) {
  const reglas = reglasPassword(nueva, dni)
  return (
    <>
      <div className="form-group">
        <label htmlFor="pw-nueva">Nueva contraseña</label>
        <PasswordInput id="pw-nueva" value={nueva} onChange={setNueva} autoComplete="new-password" />
        <ul className="password-rules">
          {reglas.map((r) => (
            <li key={r.texto} className={r.ok ? 'ok' : ''}>
              <Icon name={r.ok ? 'check' : 'minus'} size={14} /> {r.texto}
            </li>
          ))}
        </ul>
      </div>
      <div className="form-group">
        <label htmlFor="pw-confirmar">Confirmar nueva contraseña</label>
        <PasswordInput id="pw-confirmar" value={confirmacion} onChange={setConfirmacion} autoComplete="new-password" />
        {confirmacion && confirmacion !== nueva && <div className="form-error">Las contraseñas no coinciden.</div>}
      </div>
    </>
  )
}

export function passwordValida(nueva, confirmacion, dni) {
  return reglasPassword(nueva, dni).every((r) => r.ok) && nueva === confirmacion
}
