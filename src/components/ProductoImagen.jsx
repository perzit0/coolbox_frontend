import { useEffect, useState } from 'react'

/* Ilustraciones de línea por familia: se muestran cuando el producto aún no
 * tiene foto o si la imagen no carga. */
const ICONOS = {
  Laptops: (
    <>
      <rect x="14" y="14" width="36" height="24" rx="2" />
      <path d="M8 44h48l-4 6H12z" />
    </>
  ),
  Celulares: (
    <>
      <rect x="21" y="8" width="22" height="48" rx="4" />
      <path d="M29 13h6" />
      <circle cx="32" cy="50" r="1.5" />
    </>
  ),
  Tablets: (
    <>
      <rect x="14" y="8" width="36" height="48" rx="4" />
      <circle cx="32" cy="50" r="1.5" />
    </>
  ),
  Audio: (
    <>
      <path d="M14 38v-6a18 18 0 0 1 36 0v6" />
      <rect x="10" y="36" width="10" height="16" rx="3" />
      <rect x="44" y="36" width="10" height="16" rx="3" />
    </>
  ),
  Televisores: (
    <>
      <rect x="8" y="12" width="48" height="30" rx="2" />
      <path d="M24 50h16M32 42v8" />
    </>
  ),
  'Smartwatch y Wearables': (
    <>
      <rect x="20" y="18" width="24" height="28" rx="6" />
      <path d="M24 18l2-10h12l2 10M24 46l2 10h12l2-10" />
    </>
  ),
  'Accesorios de Cómputo': (
    <>
      <rect x="22" y="10" width="20" height="36" rx="10" />
      <path d="M32 10v12" />
      <path d="M32 46v8" />
    </>
  ),
  Gamer: (
    <>
      <path d="M18 22h28a10 10 0 0 1 9.7 12.4l-2.4 9.6a5 5 0 0 1-8.6 2L40 40H24l-4.7 6a5 5 0 0 1-8.6-2l-2.4-9.6A10 10 0 0 1 18 22z" />
      <path d="M20 31v6M17 34h6" />
      <circle cx="42" cy="32" r="1.5" />
      <circle cx="46" cy="36" r="1.5" />
    </>
  ),
}
ICONOS.Accesorios = ICONOS['Accesorios de Cómputo']
ICONOS.Gaming = ICONOS.Gamer

const ICONO_GENERICO = (
  <>
    <path d="M12 22l20-10 20 10v22L32 54 12 44z" />
    <path d="M12 22l20 10 20-10M32 32v22" />
  </>
)

export default function ProductoImagen({ producto, size = 'md' }) {
  const [fallo, setFallo] = useState(false)
  const url = producto?.imagen_url || producto?.producto_imagen_url
  const familia = producto?.familia || producto?.categoria

  // Si cambia la imagen (p. ej. en el formulario), volver a intentar cargarla
  useEffect(() => { setFallo(false) }, [url])

  const clase = `prod-img prod-img-${size}`
  if (url && !fallo) {
    return (
      <div className={clase}>
        <img src={url} alt={producto?.nombre || 'Producto'} loading="lazy" referrerPolicy="no-referrer" onError={() => setFallo(true)} />
      </div>
    )
  }
  return (
    <div className={`${clase} prod-img-placeholder`} aria-label="Producto sin foto">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {ICONOS[familia] || ICONO_GENERICO}
      </svg>
      {size !== 'xs' && size !== 'sm' && producto?.marca && <span className="prod-img-brand">{producto.marca}</span>}
    </div>
  )
}
