// Carrito persistente por usuario: se guarda en MySQL, así que sobrevive
// a cerrar sesión, cambiar de navegador o de dispositivo.
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Devuelve el carrito con datos frescos del producto (precio/stock actuales)
async function leerCarrito(usuarioId) {
  const [rows] = await db.query(
    `SELECT c.producto_id AS id, c.cantidad AS qty,
            p.nombre, p.precio, p.imagen, p.stock
       FROM carrito_items c
       JOIN productos p ON p.id = c.producto_id
      WHERE c.usuario_id = ? AND p.activo = 1
      ORDER BY c.agregado_en ASC`,
    [usuarioId]
  );
  return rows.map(r => ({
    id: r.id,
    nombre: r.nombre,
    precio: parseFloat(r.precio),
    imagen: r.imagen || '',
    stock: r.stock,
    // Si el stock bajó desde que se agregó, se ajusta la cantidad mostrada
    qty: Math.min(r.qty, r.stock)
  })).filter(i => i.qty > 0);
}

// GET /api/carrito
router.get('/', verificarToken, async (req, res) => {
  try {
    res.json(await leerCarrito(req.usuario.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el carrito.' });
  }
});

// PUT /api/carrito  body: { items: [{ producto_id, cantidad }] }
// Reemplaza el carrito completo del usuario (el frontend manda su estado actual).
router.put('/', verificarToken, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : null;
  if (!items) return res.status(400).json({ error: 'Formato de carrito inválido.' });
  if (items.length > 100) return res.status(400).json({ error: 'Demasiados productos en el carrito.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM carrito_items WHERE usuario_id = ?', [req.usuario.id]);

    for (const it of items) {
      const productoId = parseInt(it.producto_id, 10);
      const cantidad = parseInt(it.cantidad, 10);
      if (!productoId || !cantidad || cantidad < 1) continue;

      const [rows] = await conn.query('SELECT stock FROM productos WHERE id = ? AND activo = 1', [productoId]);
      if (!rows.length || rows[0].stock < 1) continue;

      await conn.query(
        `INSERT INTO carrito_items (usuario_id, producto_id, cantidad) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)`,
        [req.usuario.id, productoId, Math.min(cantidad, rows[0].stock)]
      );
    }

    await conn.commit();
    res.json(await leerCarrito(req.usuario.id));
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el carrito.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/carrito - Vaciar
router.delete('/', verificarToken, async (req, res) => {
  try {
    await db.query('DELETE FROM carrito_items WHERE usuario_id = ?', [req.usuario.id]);
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: 'Error al vaciar el carrito.' });
  }
});

module.exports = router;
