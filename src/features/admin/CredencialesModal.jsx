export default function CredencialesModal({ titulo, subtitulo, email, password, onClose }) {
  const copiar = async (texto) => {
    try { await navigator.clipboard.writeText(texto) } catch { /* ignore */ }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <header className="modal-header">
          <h3>{titulo}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <p style={{ marginTop: 0, color: 'var(--cb-text-soft)' }}>{subtitulo}</p>

          <div className="credentials-box">
            <div className="cred-label">Correo institucional</div>
            <div className="cred-value">{email}</div>
            <div className="cred-label">Contraseña</div>
            <div className="cred-value">{password}</div>
          </div>

          <div className="alert alert-info">
            Comparte estas credenciales de forma segura con el usuario. Podrá cambiar su contraseña más adelante.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => copiar(`Correo: ${email}\nContraseña: ${password}`)}>
            Copiar credenciales
          </button>
          <button className="btn btn-primary" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  )
}
