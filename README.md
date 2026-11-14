# Coolbox — Frontend

SPA React + Vite para el sistema Coolbox. Tiene un único inicio de sesión
para todo el personal; si el usuario tiene más de un rol (el Administrador
incluido), elige con cuál trabajar. Incluye un flujo completo de venta en
tienda con fotos de producto.

## Desarrollo local

1. Instala Node.js 20 o superior.
2. `npm install`
3. Copia `.env.example` a `.env.local` y define `VITE_API_URL=http://localhost:5000/api`.
4. `npm run dev` y abre `http://localhost:5173`.

## Variables de entorno

| Variable        | Ejemplo                                           |
| --------------- | ------------------------------------------------- |
| `VITE_API_URL`  | `https://coolbox-backend.onrender.com/api`        |

No incluyas la barra final. Vite compila la variable al momento del build,
por lo que cambiarla en Vercel requiere un nuevo despliegue.

## Rutas

- `/login` — Ingreso único para todo el personal.
- `/seleccionar-rol` — Solo si el usuario tiene más de un rol; aquí se elige también el rol Administrador.
- `/admin/*` — Panel administrativo (rol activo Administrador): usuarios, productos, ventas, reportes.
- `/tienda/*` — Operación en tienda (Cajero y Supervisor de Caja): nueva venta, historial, catálogo y reportes.

La opción **Anular** del historial de ventas solo aparece si el rol activo
tiene el permiso `ventas.anular` (Supervisor de Caja o Administrador). El Cajero anula ventas de su caja abierta con el PIN de un supervisor.
Las ventas no solicitan DNI/RUC del cliente; solo un nombre de referencia opcional.

Cada opción de la barra superior se muestra sólo si el rol activo tiene el
permiso correspondiente. Los usuarios con más de un rol pueden usar el
botón **Cambiar rol** para volver a la pantalla de selección sin cerrar
sesión.

## Despliegue en Vercel

1. Publica este directorio como el repositorio independiente `coolbox-frontend`.
2. En Vercel: **Add New Project** → importa el repositorio, deja el preset de Vite.
3. En **Settings → Environment Variables** crea `VITE_API_URL` con la URL pública de Render terminada en `/api`. Añádela a Production, Preview y Development.
4. Despliega y copia la URL de Vercel.
5. En Render, actualiza `FRONTEND_ORIGIN` con esa URL exacta y redeplega el backend.

`vercel.json` reenvía todas las rutas a `index.html`, por lo que las rutas
SPA (`/admin/usuarios`, `/tienda`, etc.) funcionan incluso al recargar la
página directamente.


## Novedades v2.0

- Menú lateral por permisos del rol activo (adaptado a celular).
- Notificaciones y diálogos propios en lugar de `alert`/`confirm`/`prompt`.
- Productos con SKU de 8 dígitos coloreado por bloques, filtros por familia,
  subfamilia, marca y estado de stock, vista tabla/grilla y formulario con
  vista previa del SKU. Página "Familias y SKU" que explica la codificación.
- Almacén con entradas, salidas y ajustes por conteo con motivo; Kardex general
  y por producto.
- Nueva venta con búsqueda/escaneo por SKU (Enter agrega), filtros por familia,
  control de cantidades, cálculo de vuelto y ticket imprimible de 80 mm.
- Historial de ventas con filtros, paginación y anulación con motivo.
- Reportes con rangos de fecha, gráficos y top de productos; panel
  administrativo con indicadores del día e inventario por reponer.
- Mi cuenta (datos de contacto y cambio de contraseña) y cambio obligatorio de
  la contraseña temporal en el primer ingreso.

## Novedades v3.0 — Módulo de Ventas y Caja

- **Mi caja** (`/caja`, Cajero): apertura con fondo inicial, resumen del turno con **cuadre ciego**, retiro parcial de efectivo con PIN, cierre con arqueo por billetes y monedas y conciliación de tarjeta/QR/Yape/Plin, reporte de cierre imprimible (80 mm) e historial de cierres.
- **Autorización con PIN** (`src/components/Autorizacion.jsx`): modal que se abre sobre la venta en curso; el supervisor elige su nombre, escribe su PIN y el motivo. Se usa para quitar o restar productos, cancelar la venta, descuentos mayores al 5 %, anular ventas, retiros, reimpresiones y cierres con diferencia.
- **Nueva venta**: pago mixto (efectivo, tarjeta en POS, QR, Yape, Plin) con N° de operación, descuento, DNI obligatorio en ventas mayores a S/ 700, **ventas en espera** (hasta 5) y borrador guardado en el navegador para no perder la venta si se recarga la página.
- **Nueva venta** queda bloqueada si la caja está cerrada o es de un día anterior; muestra la caja activa y lo vendido.
- **Control de cajas** (`/cajas`, Supervisor y Administrador): turnos abiertos y cerrados, sobrantes, faltantes, retiros, detalle de ventas por caja y **bitácora de autorizaciones**.
- **Mi cuenta**: el Supervisor de Caja y el Administrador crean o cambian su PIN de autorización.
- **Historial de ventas**: muestra la caja de cada venta y oculta "Anular" cuando la caja ya se cerró.
- **Reportes**: cuadre de cajas por cajero. El panel del Administrador avisa si hay cajas abiertas o con diferencia.
- Se retiró el rol Almacenero y "Cambiar rol" pide un token nuevo sin rol activo.
