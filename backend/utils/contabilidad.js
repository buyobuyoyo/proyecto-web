// Genera el XML del libro contable (ingresos y gastos) a partir de las filas de `finanza`.
// Es un reporte interno, no una contabilidad electrónica del SAT.
const { esc } = require('./comprobante');

const dinero = (n) => Number(n).toFixed(2);

// filas:   [{ id, fecha, tipo, monto, origen }]
// periodo: { desde, hasta } (opcionales)
function generarContabilidad(filas, periodo = {}) {
  // Suma los montos de un tipo de movimiento. Number() porque MySQL puede entregar DECIMAL como texto.
  const suma = (tipo) => filas.filter((f) => f.tipo === tipo).reduce((acc, f) => acc + Number(f.monto), 0);
  // Utilidad = ingresos - (gastos de insumos + gastos de personal).
  const ingresos = suma('ingreso_venta');
  const gastos = suma('gasto_insumo') + suma('gasto_personal');

  // Un elemento <Movimiento> por fila de la tabla `finanza`.
  const movimientos = filas
    .map(
      (f) =>
        `    <Movimiento id="${f.id}" fecha="${esc(f.fecha)}" tipo="${esc(f.tipo)}" monto="${dinero(f.monto)}" origen="${esc(f.origen)}"/>`,
    )
    .join('\n');

  // Estructura: Resumen (totales) + Movimientos (detalle). Los atributos vacíos indican "sin filtro".
  return `<?xml version="1.0" encoding="UTF-8"?>
<Contabilidad emisor="Cafetería SweetSpot" moneda="MXN" generado="${new Date().toISOString()}" desde="${esc(periodo.desde)}" hasta="${esc(periodo.hasta)}">
  <Resumen ingresos="${dinero(ingresos)}" gastosInsumos="${dinero(suma('gasto_insumo'))}" gastosPersonal="${dinero(suma('gasto_personal'))}" utilidad="${dinero(ingresos - gastos)}"/>
  <Movimientos>
${movimientos}
  </Movimientos>
  <Aviso>Reporte interno sin validez fiscal</Aviso>
</Contabilidad>
`;
}

module.exports = { generarContabilidad };
