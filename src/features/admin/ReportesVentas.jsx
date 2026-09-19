import { useEffect, useState } from 'react'
import { ventasApi } from '../../api/client'

export default function ReportesVentas() {
  const [reporte, setReporte] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ventasApi.reporte().then(setReporte).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-page">Generando reporte…</div>

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes de Ventas</h1>
          <p className="page-subtitle">Resumen operativo del negocio.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total facturado</p>
          <p className="stat-value">S/ {Number(reporte.total_facturado).toFixed(2)}</p>
          <p className="stat-hint">Ventas completadas</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Ventas completadas</p>
          <p className="stat-value">{reporte.ventas_completadas}</p>
        </div>
        <div className="stat-card stat-black">
          <p className="stat-label">Ventas anuladas</p>
          <p className="stat-value">{reporte.ventas_anuladas}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Notas</h3></div>
        <p style={{ color: 'var(--cb-text-soft)', margin: 0 }}>
          Los reportes se calculan sobre las ventas confirmadas en el sistema. Para ver el detalle de cada venta,
          usa la sección de <strong>historial de ventas</strong>.
        </p>
      </div>
    </>
  )
}
