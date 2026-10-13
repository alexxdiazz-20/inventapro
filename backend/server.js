require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Servir imágenes subidas
app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));

// Rutas API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/perfil', require('./routes/perfil'));
app.use('/api/carrito', require('./routes/carrito'));
app.use('/api/stripe', require('./routes/stripe'));

// Ruta raíz → login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Catch-all para rutas del frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📦 Sistema de Inventario listo`);
  console.log(`👤 Admin por defecto: admin@inventario.com / Admin123!\n`);
});
