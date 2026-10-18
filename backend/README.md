# Backend

API del POS de la cafetería: Node + Express + MySQL (XAMPP).

## Cómo correrlo

1. Enciende **MySQL** en XAMPP. La base `pos_cafeteria` se crea importando `database/bd.sql`.
2. En esta carpeta: `npm install` (solo la primera vez) y `npm start`.
3. El API queda en `http://localhost:3200/api`. Si el puerto está ocupado (por ejemplo, por otro backend), el servidor avisa y se detiene; se puede cambiar con la variable `PORT` (y ajustar `apiUrl` en `frontend/src/environments/environment.ts`).

Conexión por defecto: `localhost`, usuario `root`, sin contraseña, base `pos_cafeteria`
(se puede cambiar con las variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

## Rutas

| Ruta | Qué hace |
|---|---|
| `/api/categorias`, `/api/proveedores`, `/api/finanzas` | CRUD simple |
| `/api/productos` | CRUD; el listado trae la categoría anidada |
| `/api/compras`, `/api/ventas` | CRUD con transacción: línea + stock + finanzas se guardan juntos o ninguno |
| `/api/empleados` | **Solo consulta** (RH no tiene crear/editar/eliminar) |
