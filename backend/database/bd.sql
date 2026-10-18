CREATE TABLE categoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);

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

CREATE TABLE empleado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cargo VARCHAR(60) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','baja')),
  foto VARCHAR(255),
  rendimiento DECIMAL(5,2) DEFAULT 0,
  fecha_alta DATE NOT NULL DEFAULT (CURRENT_DATE)
);

CREATE TABLE usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador','cliente')),
  id_empleado INT,
  FOREIGN KEY (id_empleado) REFERENCES empleado(id)
);

CREATE TABLE turno (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado INT NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME,
  hora_salida TIME,
  FOREIGN KEY (id_empleado) REFERENCES empleado(id)
);

CREATE TABLE movimiento_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','salida')),
  cantidad INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(200),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

CREATE TABLE proveedor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  contacto VARCHAR(150)
);

CREATE TABLE proveedor_producto (
  id_proveedor INT NOT NULL,
  id_producto INT NOT NULL,
  PRIMARY KEY (id_proveedor, id_producto),
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

CREATE TABLE compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
  id_proveedor INT NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','recibida','cancelada')),
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id)
);

CREATE TABLE detalle_compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_compra INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_compra) REFERENCES compra(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

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

CREATE TABLE detalle_venta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES venta(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

CREATE TABLE devolucion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(200),
  monto DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES venta(id)
);

CREATE TABLE finanza (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso_venta','gasto_insumo','gasto_personal')),
  monto DECIMAL(10,2) NOT NULL,
  origen VARCHAR(100)
);