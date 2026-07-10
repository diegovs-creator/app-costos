// Espejo, del lado del frontend, de backend/src/utils/calculos.js y parser.js
// Se usa solo para mostrar una vista previa en vivo mientras se arma la receta;
// el costo definitivo siempre lo recalcula el backend al guardar.

const CONVERSIONES = {
  kg: { kg: 1, g: 0.001 },
  g: { g: 1, kg: 1000 },
  l: { l: 1, ml: 0.001 },
  ml: { ml: 1, l: 1000 },
  unidades: { unidades: 1 },
};

export function unidadesCompatibles(medidaBase, medidaUsada) {
  const tabla = CONVERSIONES[medidaBase];
  return Boolean(tabla && medidaUsada in tabla);
}

// Convierte una cantidad de una unidad a otra compatible (ej: 500 g -> 0.5 kg).
// Devuelve null si las unidades no son compatibles entre si.
export function convertirAUnidad(cantidad, medidaOrigen, medidaDestino) {
  if (!unidadesCompatibles(medidaDestino, medidaOrigen)) return null;
  return cantidad * CONVERSIONES[medidaDestino][medidaOrigen];
}

export function costoIngredienteUsado(ingrediente, cantidadUsada, medidaUsada) {
  if (!ingrediente || !unidadesCompatibles(ingrediente.medida, medidaUsada)) return null;
  const factor = CONVERSIONES[ingrediente.medida][medidaUsada];
  const cantidadEnMedidaBase = cantidadUsada * factor;
  const costoPorUnidadBase = ingrediente.precio / ingrediente.cantidad;
  return costoPorUnidadBase * cantidadEnMedidaBase;
}

export function calcularPrecioMarkup(costo, porcentaje) {
  return costo * (1 + porcentaje / 100);
}

export function calcularPrecioMargen(costo, porcentaje) {
  if (porcentaje >= 100) return null;
  return costo / (1 - porcentaje / 100);
}

// Peso total (en kg) de las filas de una receta, para el modo de venta "por kilo".
// Suma kg/g directo y l/ml como si fuera kg (1 litro ~ 1kg). Nunca cuenta
// envases ni ingredientes medidos en "unidades" (no tienen peso convertible).
const FACTOR_PESO_KG = { kg: 1, g: 0.001, l: 1, ml: 0.001 };

export function calcularPesoTotalKg(filas) {
  return filas.reduce((acc, fila) => {
    if (!fila.ingrediente || fila.ingrediente.tipo === 'envase') return acc;
    const { cantidad, medida } = fila.cantidadParseada || {};
    const factor = medida ? FACTOR_PESO_KG[medida] : undefined;
    if (cantidad == null || factor == null) return acc;
    return acc + cantidad * factor;
  }, 0);
}

const NORMALIZAR_UNIDAD = {
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg',
  g: 'g', gr: 'g', grs: 'g', gramo: 'g', gramos: 'g',
  ml: 'ml', mililitro: 'ml', mililitros: 'ml',
  l: 'l', lt: 'l', litro: 'l', litros: 'l',
  u: 'unidades', un: 'unidades', unidad: 'unidades', unidades: 'unidades',
};

/**
 * Parsea un texto tipo "500g", "1.5 kg", "3" -> { cantidad, medida }.
 * Si no se especifica unidad, usa medidaPorDefecto (la del ingrediente elegido).
 */
export function parsearCantidad(texto, medidaPorDefecto) {
  const limpio = texto.trim().toLowerCase();
  const match = limpio.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]*)$/);
  if (!match) return { cantidad: null, medida: null };
  const [, cantidadStr, unidadStr] = match;
  const cantidad = Number(cantidadStr.replace(',', '.'));
  const medida = unidadStr ? NORMALIZAR_UNIDAD[unidadStr] || null : medidaPorDefecto || null;
  return { cantidad, medida };
}
