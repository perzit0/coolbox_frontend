# Coolbox — Frontend

SPA React + Vite para el sistema Coolbox. Cuenta con dos accesos separados
(administrador y usuario de tienda), selección de rol al iniciar sesión y
un flujo completo de venta en tienda.

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

- `/login` — Ingreso del personal de tienda (redirige a selección de rol).
- `/login-admin` — Ingreso exclusivo del administrador.
- `/seleccionar-rol` — El usuario elige uno de sus roles.
- `/admin/*` — Panel administrativo (usuarios, productos, ventas, reportes).
- `/tienda/*` — Operación en tienda (nueva venta, historial, stock, catálogo).

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
