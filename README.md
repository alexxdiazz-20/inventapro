# 📦 InventaPro — Sistema de Gestión de Inventario

Sistema de inventario y tienda con panel de administración, catálogo, carrito
persistente, pedidos y pagos con Stripe.

## Stack
- **Frontend**: HTML + CSS + JavaScript puro
- **Backend**: Node.js + Express
- **Base de datos**: MySQL (XAMPP)
- **Auth**: JWT (JSON Web Tokens)
- **Pagos**: Stripe

---

## ⚙️ Instalación

### 1. Base de datos
1. Abre XAMPP y enciende **Apache** y **MySQL**.
2. Entra a `http://localhost/phpmyadmin`.
3. Pestaña **SQL**, pega TODO el contenido de `database.sql` y ejecuta.
   (Un solo archivo crea toda la base con datos de ejemplo.)

### 2. Dependencias
```bash
cd backend
npm install
```

### 3. Variables de entorno
Copia `.env.example` como `.env` dentro de `backend/` y rellena tus valores:
```bash
cd backend
cp .env.example .env     # en Windows: copy .env.example .env
```
Rellena tu `JWT_SECRET` (una cadena larga y aleatoria) y, si vas a usar pagos,
tus claves de Stripe (https://dashboard.stripe.com/test/apikeys).

### 4. Iniciar el servidor
```bash
cd backend
node server.js
# o con recarga automática:
npm run dev
```

### 5. Abrir
Ve a **http://localhost:3000**

---

## 👤 Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Email | `admin@inventario.com` |
| Contraseña | `Admin123!` |
| Rol | Administrador |

> ⚠️ **Cambia la contraseña del admin después de entrar.** Es pública (está en
> `database.sql`), así que no la dejes en producción.

Para generar un hash nuevo:
```bash
cd backend
node -e "console.log(require('bcryptjs').hashSync('TuNuevaClave', 10))"
```
Y en phpMyAdmin:
```sql
UPDATE usuarios SET password = 'EL_HASH' WHERE email = 'admin@inventario.com';
```

---

## 🗂️ Estructura

```
inventario/
├── backend/
│   ├── config/db.js          # Conexión a MySQL
│   ├── middleware/auth.js     # Verificación JWT y roles
│   ├── utils/validaciones.js  # Reglas de correo, contraseña y nombre
│   ├── routes/
│   │   ├── auth.js            # Login y registro
│   │   ├── productos.js       # CRUD de productos + imágenes
│   │   ├── categorias.js      # CRUD de categorías
│   │   ├── dashboard.js       # Stats y usuarios
│   │   ├── pedidos.js         # Pedidos
│   │   ├── perfil.js          # Nombre, correo y contraseña del usuario
│   │   ├── carrito.js         # Carrito persistente
│   │   └── stripe.js          # Pagos
│   ├── server.js
│   ├── .env                   # (NO se sube — lo creas tú)
│   └── .env.example
├── frontend/
│   ├── index.html            # Login / Registro
│   ├── pages/
│   │   ├── catalogo.html     # Vista de usuario
│   │   └── admin.html        # Panel de administración
│   └── uploads/              # Imágenes subidas (se crea solo)
├── database.sql              # Base de datos completa (un solo archivo)
├── PENDIENTES.md             # Lista de mejoras por hacer
└── README.md
```

---

## 🎯 Funcionalidades

### Usuario
- Crear cuenta / iniciar sesión (con validación de correo y contraseña)
- Ver el ojito para mostrar/ocultar la contraseña
- Catálogo con búsqueda, filtro por categoría y orden
- Carrito **persistente** (se guarda aunque cierres sesión)
- Checkout con envío y pago por Stripe
- "Mi cuenta": cambiar nombre, foto, correo y contraseña
- Historial de pedidos

### Administrador
- Todo lo de usuario +
- Dashboard con estadísticas y alertas de stock bajo
- Crear / editar / eliminar productos (con foto, drag & drop)
- Gestión de categorías
- Gestión de usuarios (rol, activar/desactivar)
- Historial de movimientos de stock
- Ver y gestionar todos los pedidos

---

## ❓ Problemas comunes

**"Error conectando a MySQL"** → XAMPP encendido y base `inventario_db` creada.
**"Cannot find module"** → `npm install` dentro de `backend/`.
**Página en blanco / 404** → el servidor Node debe estar corriendo.
**El login rellena solo una contraseña rara** → es Chrome; bórrala en
`chrome://password-manager/passwords`.
