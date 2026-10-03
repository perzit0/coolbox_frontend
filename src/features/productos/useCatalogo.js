import { useEffect, useState } from 'react'
import { catalogoApi } from '../../api/client'

/** Familias (con subfamilias) y marcas, cacheadas mientras la app esté abierta. */
let cache = null

export function invalidarCatalogo() { cache = null }

export default function useCatalogo() {
  const [data, setData] = useState(cache || { familias: [], marcas: [], cargando: true })
  useEffect(() => {
    if (cache) return
    Promise.all([catalogoApi.familias(), catalogoApi.marcas()])
      .then(([f, m]) => {
        cache = { familias: f.familias || [], marcas: m.marcas || [], cargando: false }
        setData(cache)
      })
      .catch(() => setData((d) => ({ ...d, cargando: false })))
  }, [])
  return data
}
