const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Configuración de subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../frontend/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `producto_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máx
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
                allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  }
});

// GET /api/productos - Listar todos (público con filtros)
router.get('/', async (req, res) => {
  try {
    const { buscar, categoria, orden } = req.query;
    let sql = `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = 1
    `;
    const params = [];

    if (buscar) {
      sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
      params.push(`%${buscar}%`, `%${buscar}%`);
    }
    if (categoria) {
      sql += ' AND p.categoria_id = ?';
      params.push(categoria);
    }

    const ordenMap = {
      'precio_asc': 'p.precio ASC',
      'precio_desc': 'p.precio DESC',
      'nombre': 'p.nombre ASC',
      'stock': 'p.stock DESC',
      'nuevo': 'p.creado_en DESC'
    };
    sql += ` ORDER BY ${ordenMap[orden] || 'p.creado_en DESC'}`;

    const [productos] = await db.query(sql, params);
    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos.' });
  }
});

// GET /api/productos/:id - Detalle de producto
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ? AND p.activo = 1
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el producto.' });
  }
});

// POST /api/productos - Crear producto (solo admin)
router.post('/', verificarToken, soloAdmin, upload.single('imagen'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, stock_minimo, categoria_id } = req.body;

    if (!nombre || precio === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Nombre, precio y stock son requeridos.' });
    }

    const imagen = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO productos (nombre, descripcion, precio, stock, stock_minimo, categoria_id, imagen)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion || null, precio, stock, stock_minimo || 5, categoria_id || null, imagen]
    );

    // Registrar movimiento inicial si hay stock
    if (parseInt(stock) > 0) {
      await db.query(
        `INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
         VALUES (?, ?, 'entrada', ?, 0, ?, 'Stock inicial al crear producto')`,
        [result.insertId, req.usuario.id, stock, stock]
      );
    }

    res.status(201).json({ mensaje: 'Producto creado exitosamente.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el producto.' });
  }
});

// PUT /api/productos/:id - Editar producto (solo admin)
router.put('/:id', verificarToken, soloAdmin, upload.single('imagen'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, stock_minimo, categoria_id } = req.body;
    const id = req.params.id;

    // Obtener stock anterior para registrar movimiento
    const [actual] = await db.query('SELECT stock, imagen FROM productos WHERE id = ?', [id]);
    if (actual.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

    const stockAnterior = actual[0].stock;
    const imagenAnterior = actual[0].imagen;

    // Si subieron nueva imagen, eliminar la anterior
    let imagen = imagenAnterior;
    if (req.file) {
      if (imagenAnterior) {
        const oldPath = path.join(__dirname, '../../frontend', imagenAnterior);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imagen = `/uploads/${req.file.filename}`;
    }

    await db.query(
      `UPDATE productos SET nombre=?, descripcion=?, precio=?, stock=?, stock_minimo=?, categoria_id=?, imagen=?
       WHERE id = ?`,
      [nombre, descripcion || null, precio, stock, stock_minimo || 5, categoria_id || null, imagen, id]
    );

    // Registrar movimiento si el stock cambió
    const nuevoStock = parseInt(stock);
    if (nuevoStock !== stockAnterior) {
      const diff = nuevoStock - stockAnterior;
      const tipo = diff > 0 ? 'entrada' : (diff < 0 ? 'salida' : 'ajuste');
      await db.query(
        `INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
         VALUES (?, ?, ?, ?, ?, ?, 'Ajuste desde panel admin')`,
        [id, req.usuario.id, tipo, Math.abs(diff), stockAnterior, nuevoStock]
      );
    }

    res.json({ mensaje: 'Producto actualizado correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el producto.' });
  }
});

// DELETE /api/productos/:id - Eliminar producto (soft delete, solo admin)
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM productos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

    await db.query('UPDATE productos SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Producto eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el producto.' });
  }
});

// GET /api/productos/admin/todos - Lista admin (incluye inactivos)
router.get('/admin/todos', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [productos] = await db.query(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.creado_en DESC
    `);
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos.' });
  }
});

module.exports = router;
