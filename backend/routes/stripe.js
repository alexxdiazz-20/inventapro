const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// POST /api/stripe/payment-intent - Crear intención de pago
router.post('/payment-intent', verificarToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Carrito vacío.' });

    // Calcular total desde la base de datos (nunca confiar en el frontend)
    let total = 0;
    for (const item of items) {
      const [rows] = await db.query('SELECT precio FROM productos WHERE id = ? AND activo = 1', [item.producto_id]);
      if (rows.length === 0) return res.status(400).json({ error: `Producto ${item.producto_id} no encontrado.` });
      total += rows[0].precio * item.cantidad;
    }

    const amountCents = Math.round(total * 100); // Stripe trabaja en centavos

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        usuario_id: req.usuario.id,
        usuario_email: req.usuario.email
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: total,
      publicKey: process.env.STRIPE_PUBLIC_KEY
    });

  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message || 'Error al crear el pago.' });
  }
});

// POST /api/stripe/confirmar - Confirmar pedido tras pago exitoso
router.post('/confirmar', verificarToken, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { items, shipping, payment_intent_id } = req.body;

    // Verificar que el PaymentIntent fue pagado
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'El pago no fue completado.' });
    }

    // Calcular total real
    let total = 0;
    const itemsDetalle = [];
    for (const item of items) {
      const [rows] = await conn.query('SELECT * FROM productos WHERE id = ? AND activo = 1', [item.producto_id]);
      if (rows.length === 0) throw new Error(`Producto no encontrado.`);
      const prod = rows[0];
      if (prod.stock < item.cantidad) throw new Error(`Stock insuficiente para "${prod.nombre}".`);
      const subtotal = prod.precio * item.cantidad;
      total += subtotal;
      itemsDetalle.push({ ...item, producto: prod, subtotal });
    }

    // Crear pedido
    const [pedidoResult] = await conn.query(
      `INSERT INTO pedidos (usuario_id, total, ship_nombre, ship_email, ship_telefono, ship_direccion, ship_ciudad, ship_pais, ship_codigo_postal, metodo_pago, estado, pago_id, pagado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'stripe', 'pagado', ?, NOW())`,
      [req.usuario.id, total, shipping.nombre, shipping.email, shipping.telefono,
       shipping.direccion, shipping.ciudad, shipping.pais, shipping.codigo_postal, payment_intent_id]
    );

    const pedidoId = pedidoResult.insertId;

    for (const item of itemsDetalle) {
      await conn.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
        [pedidoId, item.producto_id, item.producto.nombre, item.producto.precio, item.cantidad, item.subtotal]
      );
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.producto_id]);
      await conn.query(
        `INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo) VALUES (?, ?, 'salida', ?, ?, ?, ?)`,
        [item.producto_id, req.usuario.id, item.cantidad, item.producto.stock, item.producto.stock - item.cantidad, `Venta Stripe - Pedido #${pedidoId}`]
      );
    }

    // El pedido ya se pagó: vaciar el carrito guardado del usuario
    await conn.query('DELETE FROM carrito_items WHERE usuario_id = ?', [req.usuario.id]);

    await conn.commit();
    res.json({ mensaje: '¡Pedido confirmado!', pedido_id: pedidoId, total });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error al confirmar pedido.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
