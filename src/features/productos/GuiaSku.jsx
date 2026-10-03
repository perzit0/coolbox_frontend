import { useEffect, useState } from 'react'
import { productosApi } from '../../api/client'
import SkuCode from '../../components/SkuCode'
import useCatalogo from './useCatalogo'

/** Explica la estructura del SKU y muestra las tablas maestras de códigos. */
export default function GuiaSku() {
  const { familias, marcas } = useCatalogo()
  const [conteo, setConteo] = useState({})
  const [ejemplo, setEjemplo] = useState(null)

  useEffect(() => {
    productosApi.listar({ solo_activos: false }).then((r) => {
      const c = {}
      r.productos.forEach((p) => { c[p.subfamilia_id] = (c[p.subfamilia_id] || 0) + 1 })
      setConteo(c)
      setEjemplo(r.productos.find((p) => p.sku === '10020401') || r.productos[0])
    }).catch(() => {})
  }, [])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Familias y SKU</h1>
          <p className="page-subtitle">Cómo se arma el código interno de 8 dígitos de cada producto.</p>
        </div>
      </div>

      <div className="card sku-explainer">
        <div className="sku-big">
          {[['10', 'Familia'], ['02', 'Subfamilia'], ['04', 'Marca'], ['01', 'Correlativo']].map(([d, t], i) => (
            <div key={t} className={`sku-block sku-p${i}`}>
              <span className="sku-block-digits">{d}</span>
              <span className="sku-block-label">{t}</span>
              <span className="sku-block-pos">Dígitos {i * 2 + 1}-{i * 2 + 2}</span>
            </div>
          ))}
        </div>
        <div className="sku-rules">
          <p><strong>1-2 · Familia:</strong> el tipo de producto. Avanzan de 10 en 10 (10 Laptops, 20 Celulares…) para poder intercalar familias nuevas sin renumerar.</p>
          <p><strong>3-4 · Subfamilia:</strong> la línea dentro de la familia (01, 02, 03…). Por ejemplo, en Laptops: 01 Uso personal y oficina, 02 Gamer, 03 Premium.</p>
          <p><strong>5-6 · Marca:</strong> código global de la marca, el mismo en todas las familias (01 = Apple en laptops, celulares, tablets y audio).</p>
          <p><strong>7-8 · Correlativo:</strong> número de orden del producto dentro de esa familia + subfamilia + marca (hasta 99). Nunca se reutiliza.</p>
          {ejemplo && (
            <p className="sku-example">
              Ejemplo real: <SkuCode sku={ejemplo.sku} producto={ejemplo} /> = {ejemplo.familia} · {ejemplo.subfamilia} · {ejemplo.marca} · producto n.° {Number(ejemplo.sku?.slice(6))} → <em>{ejemplo.nombre}</em>
            </p>
          )}
          <p className="muted small">El sistema genera el SKU al registrar el producto y no se puede editar: si se clasificó mal, se desactiva y se registra de nuevo, así el historial de ventas y el kardex siguen siendo correctos.</p>
        </div>
      </div>

      <div className="grid-2-1">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Familias y subfamilias</h3></div>
          <table className="data-table compact">
            <thead><tr><th>Código</th><th>Familia</th><th>Subfamilias (código · nombre · productos)</th></tr></thead>
            <tbody>
              {familias.map((f) => (
                <tr key={f.id}>
                  <td><span className="sku-part sku-p0 solo">{f.codigo}</span></td>
                  <td><strong>{f.nombre}</strong><div className="cell-sub">{f.descripcion}</div></td>
                  <td>
                    <ul className="sub-list">
                      {f.subfamilias.map((s) => (
                        <li key={s.id}><span className="sku-part sku-p1 solo">{s.codigo}</span> {s.nombre} <span className="muted">({conteo[s.id] || 0})</span></li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Marcas</h3></div>
          <table className="data-table compact">
            <thead><tr><th>Código</th><th>Marca</th></tr></thead>
            <tbody>
              {[...marcas].sort((a, b) => a.codigo.localeCompare(b.codigo)).map((m) => (
                <tr key={m.id}><td><span className="sku-part sku-p2 solo">{m.codigo}</span></td><td>{m.nombre}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
