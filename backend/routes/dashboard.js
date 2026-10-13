const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// GET /api/dashboard - Estadísticas del admin
router.get('/', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [[{ total_productos }]] = await db.query('SELECT COUNT(*) as total_productos FROM productos WHERE activo=1');
    const [[{ total_usuarios }]] = await db.query('SELECT COUNT(*) as total_usuarios FROM usuarios');
    const [[{ stock_total }]] = await db.query('SELECT SUM(stock) as stock_total FROM productos WHERE activo=1');
    const [[{ valor_inventario }]] = await db.query('SELECT SUM(precio * stock) as valor_inventario FROM productos WHERE activo=1');
    const [stock_bajo] = await db.query('SELECT * FROM productos WHERE stock <= stock_minimo AND activo=1 ORDER BY stock ASC LIMIT 5');
    const [ultimos_movimientos] = await db.query(`
      SELECT m.*, p.nombre as producto, u.nombre as usuario
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.creado_en DESC LIMIT 8
    `);
    const [usuarios] = await db.query('SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC');

    res.json({
      stats: { total_productos, total_usuarios, stock_total: stock_total || 0, valor_inventario: valor_inventario || 0 },
      stock_bajo,
      ultimos_movimientos,
      usuarios
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener datos del dashboard.' });
  }
});

// PUT /api/dashboard/usuarios/:id/rol - Cambiar rol de usuario
router.put('/usuarios/:id/rol', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { rol } = req.body;
    if (!['admin', 'usuario'].includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });
    await db.query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, req.params.id]);
    res.json({ mensaje: 'Rol actualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar rol.' });
  }
});

// PUT /api/dashboard/usuarios/:id/estado
router.put('/usuarios/:id/estado', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { activo } = req.body;
    await db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, req.params.id]);
    res.json({ mensaje: 'Estado actualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado.' });
  }
});

module.exports = router;
