-- Base de datos `pos_cafeteria` COMPLETA (MySQL / MariaDB): un solo script con todo el esquema.
--
-- Cómo usarlo: en phpMyAdmin crea la base `pos_cafeteria` (o deja que este script lo haga) y
-- usa Importar. También sirve desde la consola: `mysql < bd.sql`.
-- Es seguro ejecutarlo más de una vez: todo usa IF NOT EXISTS, no borra ni cambia datos y el
-- empleado interno se inserta solo si todavía no existe.
-- Después crea los usuarios iniciales con `npm run seed` (lee las credenciales de backend/.env).
--
-- Secciones:
--   1. Tablas del negocio (categoría, producto, empleado, proveedor, compras, ventas, finanzas...)
--   2. Checkout con PayPal (tabla pago_paypal y el empleado interno "Venta en línea")
--   3. Facturación (tabla factura)

-- Cómo leer las tablas:
--   * PRIMARY KEY ........... identifica de forma única cada fila.
--   * AUTO_INCREMENT ........ MySQL asigna el siguiente número solo (1, 2, 3...).
--   * FOREIGN KEY ........... "este campo apunta a una fila de otra tabla"; MySQL impide
--                             apuntar a algo que no existe o borrar algo que está en uso.
--   * CHECK ................. regla que el valor debe cumplir (por ejemplo, precio > 0).
--   * UNIQUE ................ no se permiten dos filas con el mismo valor.
--   * DECIMAL(10,2) ......... número con 2 decimales (se usa para dinero, nunca FLOAT).

CREATE DATABASE IF NOT EXISTS pos_cafeteria;
USE pos_cafeteria;

-- ============================================================================
-- 1. TABLAS DEL NEGOCIO
-- ============================================================================
-- Las tablas se crean en orden: primero las que no dependen de nadie y luego las que
-- tienen llaves foráneas hacia ellas.
--
-- Las tablas que usa hoy la aplicación: categoria, producto, empleado, proveedor, compra,
-- detalle_compra, venta, detalle_venta y finanza. Las demás (usuario, turno,
-- movimiento_inventario, proveedor_producto, devolucion) están creadas para funciones
-- futuras y todavía no las toca ninguna ruta del API.

-- Categorías de producto (Café, Postres...). El nombre no se puede repetir.
CREATE TABLE IF NOT EXISTS categoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);

-- Productos que se venden. `cantidad` es el stock actual (nunca negativo); no se captura al crear
-- el producto: sube con las compras recibidas y baja con las ventas.
CREATE TABLE IF NOT EXISTS producto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  id_categoria INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
  codigo_barras VARCHAR(50) UNIQUE,
  tags VARCHAR(200),
  FOREIGN KEY (id_categoria) REFERENCES categoria(id)
);

-- Personal de la cafetería (módulo RH). `estado` solo admite 'activo' o 'baja'.
-- `rendimiento` es un porcentaje; `foto` es la ruta de una imagen.
CREATE TABLE IF NOT EXISTS empleado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cargo VARCHAR(60) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','baja')),
  foto VARCHAR(255),
  rendimiento DECIMAL(5,2) DEFAULT 0,
  fecha_alta DATE NOT NULL DEFAULT (CURRENT_DATE)
);

-- Usuarios para iniciar sesión (login con JWT; el rol define a qué páginas y rutas del API entra).
-- Se guarda un hash de la contraseña, nunca la contraseña en texto. Un usuario puede
-- estar ligado a un empleado (id_empleado es opcional).
CREATE TABLE IF NOT EXISTS usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador','cliente')),
  id_empleado INT,
  FOREIGN KEY (id_empleado) REFERENCES empleado(id)
);

-- Turnos de trabajo de cada empleado (aún sin usar).
CREATE TABLE IF NOT EXISTS turno (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado INT NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME,
  hora_salida TIME,
  FOREIGN KEY (id_empleado) REFERENCES empleado(id)
);

-- Bitácora de entradas y salidas de inventario (aún sin usar).
CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','salida')),
  cantidad INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(200),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

-- Proveedores a los que se les compran insumos.
CREATE TABLE IF NOT EXISTS proveedor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  contacto VARCHAR(150)
);

-- Qué productos surte cada proveedor (relación muchos a muchos; aún sin usar).
-- La llave primaria compuesta evita registrar la misma pareja dos veces.
CREATE TABLE IF NOT EXISTS proveedor_producto (
  id_proveedor INT NOT NULL,
  id_producto INT NOT NULL,
  PRIMARY KEY (id_proveedor, id_producto),
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

-- Encabezado de una compra a un proveedor. Solo las compras 'recibida' suman stock
-- y generan gasto (ver backend/routes/compras.js).
CREATE TABLE IF NOT EXISTS compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
  id_proveedor INT NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','recibida','cancelada')),
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id)
);

-- Líneas de una compra: qué producto, cuántas unidades y a qué precio unitario.
CREATE TABLE IF NOT EXISTS detalle_compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_compra INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_compra) REFERENCES compra(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

-- Encabezado de una venta. `id_empleado` es el cajero. Solo las ventas 'confirmada'
-- descuentan stock y generan ingreso (ver backend/routes/ventas.js).
-- A diferencia de `compra`, `fecha` es DATETIME: guarda también la hora.
CREATE TABLE IF NOT EXISTS venta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_empleado INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  metodo_pago VARCHAR(10) CHECK (metodo_pago IN ('efectivo','tarjeta')),
  estado VARCHAR(20) NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada','cancelada','devuelta')),
  FOREIGN KEY (id_empleado) REFERENCES empleado(id)
);

-- Líneas de una venta. `precio_unitario` se copia aquí al vender: así, si el precio del
-- producto cambia después, las ventas pasadas conservan el precio al que se cobraron.
CREATE TABLE IF NOT EXISTS detalle_venta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES venta(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

-- Devoluciones de ventas (aún sin usar).
CREATE TABLE IF NOT EXISTS devolucion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(200),
  monto DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES venta(id)
);

-- Libro de ingresos y gastos que alimenta la pantalla de Finanzas.
-- `origen` es un texto libre; las ventas y compras automáticas escriben 'Venta #12' o 'Compra #3'.
CREATE TABLE IF NOT EXISTS finanza (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso_venta','gasto_insumo','gasto_personal')),
  monto DECIMAL(10,2) NOT NULL,
  origen VARCHAR(100)
);

-- ============================================================================
-- 2. CHECKOUT CON PAYPAL
-- ============================================================================
-- Registro de cada pago con PayPal. Guarda una copia de las líneas con el precio que calculó el
-- servidor (nunca el que mande el navegador) para poder validar el pago al capturarlo.
-- estados: creada (orden en PayPal, aún sin pagar) -> procesando -> completado.
--          fallido / reembolsado / revision cuando algo salió mal después de cobrar.
CREATE TABLE IF NOT EXISTS pago_paypal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL UNIQUE,
  id_usuario INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'MXN',
  lineas TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'creada'
    CHECK (estado IN ('creada','procesando','completado','fallido','reembolsado','revision')),
  capture_id VARCHAR(64),
  id_venta INT,
  detalle VARCHAR(255),
  creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pagado DATETIME,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id),
  FOREIGN KEY (id_venta) REFERENCES venta(id)
);

-- `venta.id_empleado` es obligatorio y una compra en línea no tiene cajero: se usa este
-- empleado interno (estado 'baja', para que no cuente como personal activo). Solo se inserta
-- si todavía no existe.
INSERT INTO empleado (nombre, cargo, estado)
SELECT 'Venta en línea', 'Canal digital (sin cajero)', 'baja' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM empleado WHERE nombre = 'Venta en línea');

-- ============================================================================
-- 3. FACTURACIÓN
-- ============================================================================
-- Un comprobante por venta. El XML se guarda tal como se generó para poder descargarlo y
-- reenviarlo sin recalcular. (Es un comprobante interno, NO un CFDI con validez fiscal.)
CREATE TABLE IF NOT EXISTS factura (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL UNIQUE,
  folio VARCHAR(30) NOT NULL UNIQUE,
  nombre_receptor VARCHAR(150) NOT NULL,
  rfc_receptor VARCHAR(13) NOT NULL,
  correo_receptor VARCHAR(120) NOT NULL,
  xml MEDIUMTEXT NOT NULL,
  creada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Estado del envío por correo: omitido = el servidor no tiene API key; fallido = el servicio de
  -- correo rechazó el envío (el detalle explica por qué). La factura existe aunque el correo falle.
  correo_estado VARCHAR(12) NOT NULL DEFAULT 'pendiente'
    CHECK (correo_estado IN ('pendiente','enviado','fallido','omitido')),
  correo_enviado DATETIME,
  correo_detalle VARCHAR(255),
  FOREIGN KEY (id_venta) REFERENCES venta(id)
);
