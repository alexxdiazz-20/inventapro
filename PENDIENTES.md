# 📋 Pendientes — InventaPro

Lista de mejoras para hacer después, ordenadas por prioridad.
Marca con [x] lo que vayas terminando.

---

## 🔴 Prioridad alta — Seguridad (hacer primero)

- [ ] **Sacar el `.env` del repo.** Crear un `.gitignore` con `.env`, `node_modules/`
      y `frontend/uploads/`. Dejar un `.env.example` con las variables pero SIN las
      claves reales. Ahora mismo el `.env` con las claves de Stripe va dentro del zip.
- [ ] **Cambiar la contraseña del admin.** La de ejemplo es `password` y está en
      `database.sql`, así que cualquiera que vea el repo la conoce. Generar un hash
      nuevo con bcrypt y actualizarlo.
- [ ] **Cambiar el `JWT_SECRET`** por uno largo y aleatorio (no el de ejemplo).
      Si se filtra, se pueden falsificar sesiones.
- [ ] **Límite de intentos de login (rate limiting)** para que no se puedan probar
      mil contraseñas seguidas. Se puede con `express-rate-limit`.

## 🟠 Prioridad media — Funcionalidad que falta

- [ ] **"Olvidé mi contraseña".** Flujo para recuperar/restablecer la contraseña.
      Hoy si un usuario la olvida no tiene cómo recuperarla.
- [ ] **El admin pueda cambiar su propia contraseña / correo** desde el panel.
      El catálogo ya tiene "Mi cuenta"; al panel de admin le falta.
- [ ] **Paginación en el catálogo.** Ahora carga todos los productos de golpe.
      Con muchos productos se pone lento. Agregar paginación o "cargar más".
- [ ] **Que el usuario pueda cancelar un pedido** (al menos los pendientes) y ver
      el detalle completo, no solo la tarjeta resumida.
- [ ] **Borrar la imagen vieja de un producto** cuando se reemplaza o se elimina.
      Ahora se quedan archivos huérfanos en `frontend/uploads/`.
      (En las fotos de perfil ya se borra; en productos no.)

## 🟡 Prioridad baja — Pulido y calidad

- [ ] **Actualizar el README.** Tiene datos viejos (la contraseña del admin, etc.).
- [ ] **Unificar el estilo del código JS** (un archivo usa `var`, otro `const`/arrow).
- [ ] **Validar mejor en el formulario de productos del admin** (precio y stock no
      negativos, campos obligatorios) — revisar que coincida front y back.
- [ ] **Unificar el límite de tamaño de imágenes** (perfil usa 3 MB, productos 5 MB).
- [ ] **Mensajes de error más claros** cuando el servidor o MySQL no están corriendo.
- [ ] **Confirmación antes de acciones destructivas** (borrar producto, etc.).

## 🔵 Ideas / extras (opcional, si quieres crecerlo)

- [ ] Verificación de correo al registrarse (si algún día lo quieres).
- [ ] Filtros adicionales en el catálogo (rango de precio, solo en stock).
- [ ] Que el admin vea un historial de quién compró qué.
- [ ] Modo claro / oscuro.
- [ ] Exportar pedidos o reportes a PDF o Excel.
- [ ] Notificación por correo al confirmar un pedido.

---

## 🧑‍💻 Parte de usuarios (lo que hablaremos después)

> _(Aquí anota lo que tienes en mente para la parte de usuarios cuando lo retomemos.)_

- [ ]
- [ ]
- [ ]

---

## ✅ Ya hecho (en esta sesión)

- [x] Ojito para ver la contraseña (login, registro y Mi cuenta).
- [x] El correo ya no se mete en el buscador del catálogo.
- [x] Los productos ya no desaparecen al agregar al carrito.
- [x] Carrito persistente por usuario (guardado en la base de datos).
- [x] "Mi cuenta" con pestañas: Datos, Correo y Contraseña.
- [x] Validación de correo y contraseña (en el front y en el back).
- [x] Escape de texto en nombres/descripciones de productos (evita inyección de HTML).
