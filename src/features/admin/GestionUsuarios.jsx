import { useEffect, useState } from 'react'
import { rolesApi, usuariosApi } from '../../api/client'
import UsuarioForm from './UsuarioForm'
import CredencialesModal from './CredencialesModal'

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [formAbierto, setFormAbierto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [credenciales, setCredenciales] = useState(null)
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    setLoading(true)
    try {
      const [u, r] = await Promise.all([usuariosApi.listar(), rolesApi.listar()])
      setUsuarios(u.usuarios || [])
      setRoles(r.roles || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const nuevo = () => { setUsuarioEditando(null); setFormAbierto(true) }
  const editar = (u) => { setUsuarioEditando(u); setFormAbierto(true) }

  const onGuardado = (respuesta) => {
    setFormAbierto(false)
    setUsuarioEditando(null)
    cargar()
    if (respuesta?.credenciales) {
      setCredenciales({
        titulo: 'Usuario creado correctamente',
        subtitulo: 'Comparte estas credenciales con el usuario para su primer ingreso:',
        email: respuesta.credenciales.email,
        password: respuesta.credenciales.password,
      })
    } else {
      setMensaje('Cambios guardados correctamente.')
      setTimeout(() => setMensaje(''), 3000)
    }
  }

  const onResetPassword = async (usuario) => {
    if (!confirm(`¿Generar una nueva contraseña temporal para ${usuario.nombre_completo}?`)) return
    const r = await usuariosApi.resetPassword(usuario.id)
    setCredenciales({
      titulo: 'Nueva contraseña generada',
      subtitulo: `Entrega esta contraseña a ${usuario.nombre_completo}. Podrá cambiarla luego.`,
      email: usuario.email,
      password: r.password,
    })
  }

  const onDesactivar = async (usuario) => {
    if (!confirm(`¿Desactivar a ${usuario.nombre_completo}? No podrá iniciar sesión.`)) return
    await usuariosApi.desactivar(usuario.id)
    cargar()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Registra al personal, asigna roles y comparte las credenciales generadas.</p>
        </div>
        <button className="btn btn-primary" onClick={nuevo}>Registrar nuevo usuario</button>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre completo</th>
              <th>DNI</th>
              <th>Correo</th>
              <th>Roles</th>
              <th>Estado</th>
              <th style={{ width: 240 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="empty-state">Cargando usuarios…</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan="6" className="empty-state">No hay usuarios registrados aún.</td></tr>
            ) : usuarios.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.nombre_completo}</strong></td>
                <td>{u.dni}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.email}</td>
                <td>
                  <div className="actions-inline">
                    {u.roles.map((r) => (
                      <span key={r.id} className={r.es_admin ? 'badge badge-red' : 'badge badge-black'}>{r.nombre}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={u.estado === 'activo' ? 'badge badge-green' : 'badge badge-gray'}>{u.estado}</span>
                </td>
                <td>
                  <div className="actions-inline">
                    <button className="btn btn-outline btn-sm" onClick={() => editar(u)}>Editar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => onResetPassword(u)}>Restablecer clave</button>
                    {u.estado === 'activo' && (
                      <button className="btn btn-danger btn-sm" onClick={() => onDesactivar(u)}>Desactivar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formAbierto && (
        <UsuarioForm
          roles={roles}
          usuario={usuarioEditando}
          onClose={() => { setFormAbierto(false); setUsuarioEditando(null) }}
          onGuardado={onGuardado}
        />
      )}

      {credenciales && (
        <CredencialesModal
          {...credenciales}
          onClose={() => setCredenciales(null)}
        />
      )}
    </>
  )
}
