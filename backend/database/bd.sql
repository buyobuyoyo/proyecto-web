-- Esquema de la base de datos `pos_cafeteria` (MySQL / MariaDB).
--
-- Cómo leer este archivo:
--   * PRIMARY KEY ........... identifica de forma única cada fila.
--   * AUTO_INCREMENT ........ MySQL asigna el siguiente número solo (1, 2, 3...).
--   * FOREIGN KEY ........... "este campo apunta a una fila de otra tabla"; MySQL impide
--                             apuntar a algo que no existe o borrar algo que está en uso.
--   * CHECK ................. regla que el valor debe cumplir (por ejemplo, precio > 0).
--   * UNIQUE ................ no se permiten dos filas con el mismo valor.
--   * DECIMAL(10,2) ......... número con 2 decimales (se usa para dinero, nunca FLOAT).
--
-- Las tablas se crean en orden: primero las que no dependen de nadie y luego las que
-- tienen llaves foráneas hacia ellas.
--
-- Las tablas que usa hoy la aplicación: categoria, producto, empleado, proveedor, compra,
-- detalle_compra, venta, detalle_venta y finanza. Las demás (usuario, turno,
-- movimiento_inventario, proveedor_producto, devolucion) están creadas para funciones
-- futuras y todavía no las toca ninguna ruta del API.

-- Categorías de producto (Café, Postres...). El nombre no se puede repetir.
CREATE TABLE categoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);

-- Productos que se venden. `cantidad` es el stock actual y nunca puede ser negativo.
CREATE TABLE producto (
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
CREATE TABLE empleado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cargo VARCHAR(60) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','baja')),
  foto VARCHAR(255),
  rendimiento DECIMAL(5,2) DEFAULT 0,
  fecha_alta DATE NOT NULL DEFAULT (CURRENT_DATE)
);

-- Usuarios para iniciar sesión (aún sin usar: el login todavía no valida nada).
-- Se guarda un hash de la contraseña, nunca la contraseña en texto. Un usuario puede
-- estar ligado a un empleado (id_empleado es opcional).
CREATE TABLE usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador','cliente')),
  id_empleado INT,
  FOREIGN KEY (id_empleado) REFERENCES empleado(id)
);

-- Turnos de trabajo de cada empleado (aún sin usar).
CREATE TABLE turno (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado INT NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME,
  hora_salida TIME,
  FOREIGN KEY (id_empleado) REFERENCES empleado(id)
);

-- Bitácora de entradas y salidas de inventario (aún sin usar).
CREATE TABLE movimiento_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','salida')),
  cantidad INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(200),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

-- Proveedores a los que se les compran insumos.
CREATE TABLE proveedor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  contacto VARCHAR(150)
);

-- Qué productos surte cada proveedor (relación muchos a muchos; aún sin usar).
-- La llave primaria compuesta evita registrar la misma pareja dos veces.
CREATE TABLE proveedor_producto (
  id_proveedor INT NOT NULL,
  id_producto INT NOT NULL,
  PRIMARY KEY (id_proveedor, id_producto),
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

-- Encabezado de una compra a un proveedor. Solo las compras 'recibida' suman stock
-- y generan gasto (ver backend/routes/compras.js).
CREATE TABLE compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
  id_proveedor INT NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','recibida','cancelada')),
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id)
);

-- Líneas de una compra: qué producto, cuántas unidades y a qué precio unitario.
CREATE TABLE detalle_compra (
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
CREATE TABLE venta (
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
CREATE TABLE detalle_venta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES venta(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

-- Devoluciones de ventas (aún sin usar).
CREATE TABLE devolucion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(200),
  monto DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES venta(id)
);

-- Libro de ingresos y gastos que alimenta la pantalla de Finanzas.
-- `origen` es un texto libre; las ventas y compras automáticas escriben 'Venta #12' o 'Compra #3'.
CREATE TABLE finanza (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso_venta','gasto_insumo','gasto_personal')),
  monto DECIMAL(10,2) NOT NULL,
  origen VARCHAR(100)
);
