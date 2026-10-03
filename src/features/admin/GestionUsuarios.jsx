import { useCallback, useEffect, useState } from 'react'
import { rolesApi, usuariosApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import { fechaHora } from '../../utils/format'
import CredencialesModal from './CredencialesModal'
import UsuarioForm from './UsuarioForm'

export default function GestionUsuarios({ sesion }) {
  const fb = useFeedback()
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [formAbierto, setFormAbierto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [credenciales, setCredenciales] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [u, r] = await Promise.all([usuariosApi.listar({ q, estado }), rolesApi.listar()])
      setUsuarios(u.usuarios || [])
      setRoles(r.roles || [])
    } catch (err) {
      fb.error(err.detail)
    } finally {
      setLoading(false)
    }
  }, [q, estado, fb])

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
  }, [cargar])

  const onGuardado = (respuesta) => {
    setFormAbierto(false)
    setUsuarioEditando(null)
    cargar()
    if (respuesta?.credenciales) {
      setCredenciales({
        titulo: 'Usuario registrado',
        subtitulo: 'Entrega estas credenciales al colaborador para su primer ingreso:',
        email: respuesta.credenciales.email,
        password: respuesta.credenciales.password,
      })
    } else {
      fb.ok('Cambios guardados correctamente.')
    }
  }

  const accion = async (fn, mensaje) => {
    try { await fn(); fb.ok(mensaje); cargar() } catch (err) { fb.error(err.detail) }
  }

  const onResetPassword = async (u) => {
    const ok = await fb.confirmar({
      titulo: 'Restablecer contraseña',
      mensaje: `Se generará una contraseña temporal para ${u.nombre_completo}. Deberá cambiarla en su próximo ingreso.`,
      textoConfirmar: 'Generar contraseña',
    })
    if (!ok) return
    try {
      const r = await usuariosApi.resetPassword(u.id)
      setCredenciales({
        titulo: 'Contraseña restablecida',
        subtitulo: `Entrega esta contraseña temporal a ${u.nombre_completo}.`,
        email: u.email,
        password: r.password,
      })
      cargar()
    } catch (err) { fb.error(err.detail) }
  }

  const onDesactivar = async (u) => {
    const ok = await fb.confirmar({
      titulo: 'Desactivar usuario',
      mensaje: `${u.nombre_completo} ya no podrá iniciar sesión. Su historial de ventas se conserva.`,
      textoConfirmar: 'Desactivar', peligro: true,
    })
    if (ok) accion(() => usuariosApi.desactivar(u.id), 'Usuario desactivado.')
  }

  const esYo = (u) => u.id === sesion.usuario.id

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de usuarios</h1>
          <p className="page-subtitle">Registra al personal, asigna roles y entrega las credenciales generadas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setUsuarioEditando(null); setFormAbierto(true) }}>
          <Icon name="plus" /> Registrar usuario
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input className="form-control" placeholder="Buscar por nombre, DNI o correo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="form-control" value={estado} onChange={(e) => setEstado(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>DNI</th>
              <th>Correo</th>
              <th>Roles</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th className="actions-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="empty-state">Cargando usuarios…</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No hay usuarios que coincidan.</td></tr>
            ) : usuarios.map((u) => (
              <tr key={u.id} className={u.estado === 'inactivo' ? 'row-muted' : ''}>
                <td>
                  <strong>{u.nombre_completo}</strong>{esYo(u) && <span className="badge badge-gray" style={{ marginLeft: 6 }}>Tú</span>}
                  {u.telefono && <div className="cell-sub">{u.telefono}</div>}
                </td>
                <td className="mono">{u.dni}</td>
                <td className="mono small">{u.email}</td>
                <td>
                  <div className="actions-inline">
                    {u.roles.map((r) => <span key={r.id} className={r.es_admin ? 'badge badge-red' : 'badge badge-black'}>{r.nombre}</span>)}
                  </div>
                </td>
                <td>
                  <span className={u.estado === 'activo' ? 'badge badge-green' : 'badge badge-gray'}>{u.estado}</span>
                  {u.debe_cambiar_password && <div className="cell-sub">Clave temporal</div>}
                </td>
                <td className="small">{u.ultimo_acceso ? fechaHora(u.ultimo_acceso) : 'Nunca'}</td>
                <td>
                  <div className="actions-inline nowrap">
                    <button className="btn btn-outline btn-sm" onClick={() => { setUsuarioEditando(u); setFormAbierto(true) }} title="Editar">
                      <Icon name="edit" size={15} /> Editar
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => onResetPassword(u)} title="Restablecer contraseña">
                      <Icon name="key" size={15} />
                    </button>
                    <button className="btn btn-outline btn-sm" title="Desbloquear (intentos fallidos)"
                      onClick={() => accion(() => usuariosApi.desbloquear(u.id), 'Cuenta desbloqueada.')}>
                      <Icon name="unlock" size={15} />
                    </button>
                    {u.estado === 'activo' ? (
                      !esYo(u) && <button className="btn btn-danger btn-sm" onClick={() => onDesactivar(u)}>Desactivar</button>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={() => accion(() => usuariosApi.activar(u.id), 'Usuario reactivado.')}>
                        Reactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formAbierto && (
        <UsuarioForm roles={roles} usuario={usuarioEditando}
          onClose={() => { setFormAbierto(false); setUsuarioEditando(null) }} onGuardado={onGuardado} />
      )}
      {credenciales && <CredencialesModal {...credenciales} onClose={() => setCredenciales(null)} />}
    </>
  )
}
