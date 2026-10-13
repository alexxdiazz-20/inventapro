const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { verificarToken } = require('../middleware/auth');
const { normalizarEmail, esEmailValido, validarPassword, validarNombre } = require('../utils/validaciones');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../frontend/uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.usuario.id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|webp/.test(file.mimetype) ? cb(null, true) : cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
  }
});

// Envuelve multer para devolver errores como JSON en vez de un 500 genérico
function subirFoto(req, res, next) {
  upload.single('foto')(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede pasar de 3 MB.' : err.message;
    res.status(400).json({ error: msg });
  });
}

async function obtenerUsuario(id) {
  const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [id]);
  return rows[0];
}

// GET /api/perfil - Obtener perfil
router.get('/', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, foto, creado_en FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil.' });
  }
});

// PUT /api/perfil - Actualizar nombre y foto
router.put('/', verificarToken, subirFoto, async (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const errNombre = validarNombre(nombre);
    if (errNombre) return res.status(400).json({ error: errNombre });

    const usuario = await obtenerUsuario(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    let foto = usuario.foto;
    if (req.file) {
      if (usuario.foto) {
        const old = path.join(__dirname, '../../frontend', usuario.foto);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      foto = `/uploads/avatars/${req.file.filename}`;
    }

    await db.query('UPDATE usuarios SET nombre = ?, foto = ? WHERE id = ?', [nombre, foto, req.usuario.id]);
    res.json({ mensaje: 'Perfil actualizado correctamente.', nombre, foto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar perfil.' });
  }
});

// PUT /api/perfil/email - Cambiar correo (requiere contraseña actual)
router.put('/email', verificarToken, async (req, res) => {
  try {
    const email = normalizarEmail(req.body.email_nuevo);
    const { password_actual } = req.body;

    if (!esEmailValido(email)) {
      return res.status(400).json({ error: 'Ingresa un correo electrónico válido (ej: tu@email.com).' });
    }
    if (!password_actual) {
      return res.status(400).json({ error: 'Confirma con tu contraseña actual.' });
    }

    const usuario = await obtenerUsuario(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    if (!(await bcrypt.compare(password_actual, usuario.password))) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }
    if (email === usuario.email) {
      return res.status(400).json({ error: 'Ese ya es tu correo actual.' });
    }

    const [emailCheck] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, req.usuario.id]);
    if (emailCheck.length > 0) return res.status(400).json({ error: 'Ese email ya está en uso.' });

    await db.query('UPDATE usuarios SET email = ? WHERE id = ?', [email, req.usuario.id]);
    res.json({ mensaje: 'Correo actualizado. Úsalo la próxima vez que inicies sesión.', email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar el correo.' });
  }
});

// PUT /api/perfil/password - Cambiar contraseña
router.put('/password', verificarToken, async (req, res) => {
  try {
    const { password_actual, password_nueva, password_confirmar } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ error: 'Completa la contraseña actual y la nueva.' });
    }
    if (password_confirmar !== undefined && password_nueva !== password_confirmar) {
      return res.status(400).json({ error: 'Las contraseñas nuevas no coinciden.' });
    }
    const errPass = validarPassword(password_nueva);
    if (errPass) return res.status(400).json({ error: errPass });

    const usuario = await obtenerUsuario(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    if (!(await bcrypt.compare(password_actual, usuario.password))) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }
    if (await bcrypt.compare(password_nueva, usuario.password)) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual.' });
    }

    const hash = await bcrypt.hash(password_nueva, 10);
    await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, req.usuario.id]);
    res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
});

module.exports = router;
