import { useState } from 'react'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'

export default function CredencialesModal({ titulo, subtitulo, email, password, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`Correo: ${email}\nContraseña temporal: ${password}`)
      setCopiado(true)
    } catch { /* el navegador no permitió copiar */ }
  }

  return (
    <Modal titulo={titulo} onClose={onClose} size="sm"
      footer={(
        <>
          <button className="btn btn-outline" onClick={copiar}>
            <Icon name={copiado ? 'check' : 'copy'} /> {copiado ? 'Copiado' : 'Copiar credenciales'}
          </button>
          <button className="btn btn-primary" onClick={onClose}>Entendido</button>
        </>
      )}>
      <p className="confirm-text">{subtitulo}</p>
      <div className="credentials-box">
        <div className="cred-label">Correo institucional</div>
        <div className="cred-value">{email}</div>
        <div className="cred-label">Contraseña temporal</div>
        <div className="cred-value">{password}</div>
      </div>
      <div className="alert alert-info">
        Es una contraseña de un solo uso: en su primer ingreso el sistema le pedirá crear una contraseña personal.
        Esta ventana es la única vez que se muestra.
      </div>
    </Modal>
  )
}
