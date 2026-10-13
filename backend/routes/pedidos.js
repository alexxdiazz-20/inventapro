const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// POST /api/pedidos - Crear pedido (usuario logueado)
router.post('/', verificarToken, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { items, shipping, metodo_pago } = req.body;
    // items: [{producto_id, cantidad}]
    // shipping: {nombre, email, telefono, direccion, ciudad, pais, codigo_postal}

    if (!items || items.length === 0) return res.status(400).json({ error: 'El carrito está vacío.' });
    if (!shipping?.nombre || !shipping?.direccion || !shipping?.ciudad) {
      return res.status(400).json({ error: 'Completa la información de envío.' });
    }

    // Verificar stock y calcular total
    let total = 0;
    const itemsDetalle = [];

    for (const item of items) {
      const [rows] = await conn.query('SELECT * FROM productos WHERE id = ? AND activo = 1', [item.producto_id]);
      if (rows.length === 0) throw new Error(`Producto ${item.producto_id} no encontrado.`);
      const prod = rows[0];
      if (prod.stock < item.cantidad) throw new Error(`Stock insuficiente para "${prod.nombre}".`);
      const subtotal = prod.precio * item.cantidad;
      total += subtotal;
      itemsDetalle.push({ ...item, producto: prod, subtotal });
    }

    // Crear pedido
    const [pedidoResult] = await conn.query(
      `INSERT INTO pedidos (usuario_id, total, ship_nombre, ship_email, ship_telefono, ship_direccion, ship_ciudad, ship_pais, ship_codigo_postal, metodo_pago, estado, pagado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pagado', NOW())`,
      [req.usuario.id, total, shipping.nombre, shipping.email, shipping.telefono,
       shipping.direccion, shipping.ciudad, shipping.pais, shipping.codigo_postal, metodo_pago || 'simulado']
    );

    const pedidoId = pedidoResult.insertId;

    // Insertar items y descontar stock
    for (const item of itemsDetalle) {
      await conn.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [pedidoId, item.producto_id, item.producto.nombre, item.producto.precio, item.cantidad, item.subtotal]
      );

      // Descontar stock
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.producto_id]);

      // Registrar movimiento
      await conn.query(
        `INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
         VALUES (?, ?, 'salida', ?, ?, ?, ?)`,
        [item.producto_id, req.usuario.id, item.cantidad, item.producto.stock, item.producto.stock - item.cantidad, `Venta - Pedido #${pedidoId}`]
      );
    }

    // El pedido ya se pagó: vaciar el carrito guardado del usuario
    await conn.query('DELETE FROM carrito_items WHERE usuario_id = ?', [req.usuario.id]);

    await conn.commit();
    res.status(201).json({ mensaje: '¡Pedido creado exitosamente!', pedido_id: pedidoId, total });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error al procesar el pedido.' });
  } finally {
    conn.release();
  }
});

// GET /api/pedidos/mis-pedidos - Historial del usuario
router.get('/mis-pedidos', verificarToken, async (req, res) => {
  try {
    const [pedidos] = await db.query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM pedido_items WHERE pedido_id = p.id) as total_items
       FROM pedidos p WHERE p.usuario_id = ? ORDER BY p.creado_en DESC`,
      [req.usuario.id]
    );

    for (const pedido of pedidos) {
      const [items] = await db.query(
        'SELECT * FROM pedido_items WHERE pedido_id = ?', [pedido.id]
      );
      pedido.items = items;
    }

    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
});

// GET /api/pedidos/admin/todos - Todos los pedidos (admin)
router.get('/admin/todos', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [pedidos] = await db.query(`
      SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email,
        (SELECT COUNT(*) FROM pedido_items WHERE pedido_id = p.id) as total_items
      FROM pedidos p
      JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.creado_en DESC
    `);

    for (const pedido of pedidos) {
      const [items] = await db.query('SELECT * FROM pedido_items WHERE pedido_id = ?', [pedido.id]);
      pedido.items = items;
    }

    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
});

// PUT /api/pedidos/:id/estado - Actualizar estado (admin)
router.put('/:id/estado', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    const estados = ['pendiente','pagado','enviado','entregado','cancelado'];
    if (!estados.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
    await db.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ mensaje: 'Estado actualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado.' });
  }
});

module.exports = router;
