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
- `/tienda/*` — Operación en tienda (Vendedor, Almacenero, Supervisor de Ventas): nueva venta, historial, catálogo, almacén, reportes.

La opción **Anular** del historial de ventas solo aparece si el rol activo
tiene el permiso `ventas.anular` (Supervisor de Ventas o Administrador).
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
