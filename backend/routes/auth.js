const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { normalizarEmail, esEmailValido, validarPassword, validarNombre } = require('../utils/validaciones');

// POST /api/auth/register - Crear cuenta
router.post('/register', async (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const email = normalizarEmail(req.body.email);
    const { password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    const errNombre = validarNombre(nombre);
    if (errNombre) return res.status(400).json({ error: errNombre });

    if (!esEmailValido(email)) {
      return res.status(400).json({ error: 'Ingresa un correo electrónico válido (ej: tu@email.com).' });
    }

    const errPass = validarPassword(password);
    if (errPass) return res.status(400).json({ error: errPass });

    // Verificar si el email ya existe
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(400).json({ error: 'Este email ya está registrado.' });
    }

    // Hashear contraseña
    const hash = await bcrypt.hash(password, 10);

    // Insertar usuario (rol siempre "usuario" al registrarse)
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, "usuario")',
      [nombre, email, hash]
    );

    res.status(201).json({
      mensaje: 'Cuenta creada exitosamente. ¡Ya puedes iniciar sesión!',
      id: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const email = normalizarEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    }

    if (!esEmailValido(email)) {
      return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
    }

    // Buscar usuario
    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const usuario = usuarios[0];

    // Verificar contraseña
    const valida = await bcrypt.compare(password, usuario.password);
    if (!valida) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      mensaje: '¡Bienvenido!',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        foto: usuario.foto || null
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
