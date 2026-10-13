const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// GET /api/categorias - Listar todas
router.get('/', async (req, res) => {
  try {
    const [cats] = await db.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías.' });
  }
});

// POST /api/categorias - Crear (solo admin)
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
    const [result] = await db.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    res.status(201).json({ mensaje: 'Categoría creada.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear categoría.' });
  }
});

// DELETE /api/categorias/:id
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM categorias WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Categoría eliminada.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar categoría.' });
  }
});

module.exports = router;
