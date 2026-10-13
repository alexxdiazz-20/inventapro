-- ============================================
-- SISTEMA DE INVENTARIO (InventaPro) — Base de datos MySQL
-- Archivo único y completo. Ejecutar en phpMyAdmin o MySQL Workbench.
-- Incluye: usuarios, categorías, productos, movimientos, pedidos,
--          items de pedido y carrito persistente.
-- ============================================

CREATE DATABASE IF NOT EXISTS inventario_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE inventario_db;

-- ──────────────────────────────────────────
-- TABLAS
-- ──────────────────────────────────────────

-- Usuarios (incluye la columna foto y el rol)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'usuario') DEFAULT 'usuario',
    foto VARCHAR(500) NULL,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    categoria_id INT,
    imagen VARCHAR(500),
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Movimientos de inventario
CREATE TABLE IF NOT EXISTS movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo ENUM('entrada', 'salida', 'ajuste') NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    motivo VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    estado ENUM('pendiente','pagado','enviado','entregado','cancelado') DEFAULT 'pendiente',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    ship_nombre VARCHAR(150),
    ship_email VARCHAR(150),
    ship_telefono VARCHAR(30),
    ship_direccion VARCHAR(255),
    ship_ciudad VARCHAR(100),
    ship_pais VARCHAR(100),
    ship_codigo_postal VARCHAR(20),
    metodo_pago VARCHAR(50) DEFAULT 'simulado',
    pago_id VARCHAR(255),
    pagado_en TIMESTAMP NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Items de cada pedido
CREATE TABLE IF NOT EXISTS pedido_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    nombre_producto VARCHAR(200),
    precio_unitario DECIMAL(10,2) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Carrito persistente por usuario (sobrevive al cerrar sesión / cambiar de equipo)
CREATE TABLE IF NOT EXISTS carrito_items (
    usuario_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    agregado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, producto_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- DATOS INICIALES
-- ──────────────────────────────────────────

INSERT INTO categorias (nombre, descripcion) VALUES
('Electrónica', 'Dispositivos electrónicos y accesorios'),
('Ropa', 'Prendas de vestir y accesorios de moda'),
('Alimentos', 'Productos alimenticios y bebidas'),
('Hogar', 'Artículos para el hogar y decoración'),
('Deportes', 'Equipos y ropa deportiva');

-- Admin por defecto — email: admin@inventario.com  contraseña: Admin123!
-- (CÁMBIALA al entrar. Para regenerar el hash:
--   node -e "console.log(require('bcryptjs').hashSync('TuClave', 10))")
INSERT INTO usuarios (nombre, email, password, rol) VALUES
('Administrador', 'admin@inventario.com', '$2a$10$JgukjmBJqYRTZayQNvjuNOvXH6YVFO9NHmMaFMsiFpuzVZCRBE73a', 'admin');

INSERT INTO productos (nombre, descripcion, precio, stock, stock_minimo, categoria_id) VALUES
('Laptop Dell XPS 15', 'Laptop profesional con pantalla OLED 15.6"', 1299.99, 15, 3, 1),
('iPhone 15 Pro', 'Smartphone Apple con chip A17 Pro', 999.00, 25, 5, 1),
('Audífonos Sony WH-1000XM5', 'Audífonos inalámbricos con cancelación de ruido', 349.99, 30, 8, 1),
('Camiseta Nike Dri-FIT', 'Camiseta deportiva de secado rápido', 35.99, 100, 20, 5),
('Zapatillas Adidas Ultraboost', 'Zapatillas running con tecnología Boost', 180.00, 45, 10, 5),
('Silla Ergonómica', 'Silla de oficina con soporte lumbar ajustable', 299.99, 12, 3, 4),
('Café Colombiano Premium', 'Café de origen único, tostado medio', 14.99, 200, 30, 3),
('Monitor LG 27" 4K', 'Monitor IPS 4K con HDR600', 549.00, 8, 2, 1),
('Mochila Samsonite', 'Mochila para laptop de 15.6" impermeable', 89.99, 60, 15, 4),
('Teclado Mecánico Keychron K2', 'Teclado inalámbrico con switches Gateron', 89.00, 20, 5, 1);
