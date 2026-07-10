import { supabase } from '../lib/supabaseClient';
import {
  unidadesCompatibles,
  costoIngredienteUsado,
  calcularPrecioMarkup,
  calcularPrecioMargen,
} from '../utils/calculosReceta';
import { lanzarError } from './errores';

async function obtenerMargenBaseCategoria(categoria) {
  const { data } = await supabase
    .from('configuracion_categoria')
    .select('margen_base')
    .eq('categoria', categoria)
    .single();
  return data ? Number(data.margen_base) : 50;
}

// Calcula costo_total (separado ingredientes/envase) y precios derivados.
// Antes vivia en backend/src/routes/recetas.js (calcularCostos); ahora corre
// en el navegador porque ya no hay backend.
async function calcularCostos({ ingredientes, categoria, margen_base, margen_individual }) {
  const ids = ingredientes.map((i) => i.ingrediente_id);
  const { data: filas, error } = await supabase.from('ingredientes').select('*').in('id', ids);
  if (error) lanzarError(error.message);

  const mapaIngredientes = new Map(filas.map((f) => [f.id, f]));

  let costoIngredientes = 0;
  let costoEnvase = 0;
  const detalle = [];

  for (const item of ingredientes) {
    const ingrediente = mapaIngredientes.get(item.ingrediente_id);
    if (!ingrediente) lanzarError(`Ingrediente con id ${item.ingrediente_id} no existe`);
    if (!unidadesCompatibles(ingrediente.medida, item.medida)) {
      lanzarError(
        `Unidad incompatible para "${ingrediente.nombre}": receta usa "${item.medida}", ingrediente esta en "${ingrediente.medida}"`
      );
    }
    const costo = costoIngredienteUsado(ingrediente, item.cantidad_usada, item.medida);
    if (ingrediente.tipo === 'envase') costoEnvase += costo;
    else costoIngredientes += costo;
    detalle.push({ ...item, costo });
  }

  costoIngredientes = Number(costoIngredientes.toFixed(2));
  costoEnvase = Number(costoEnvase.toFixed(2));
  const costoTotal = Number((costoIngredientes + costoEnvase).toFixed(2));

  const margenAplicado = margen_individual ?? margen_base ?? (await obtenerMargenBaseCategoria(categoria));
  const precioMarkup = calcularPrecioMarkup(costoTotal, margenAplicado);
  const precioMargen = calcularPrecioMargen(costoTotal, margenAplicado);
  const gananciaEstimada = Number(((precioMargen ?? precioMarkup) - costoTotal).toFixed(2));

  return { costoIngredientes, costoEnvase, costoTotal, detalle, precioMarkup, precioMargen, gananciaEstimada };
}

function mapearFilaIngrediente(row) {
  return {
    id: row.id,
    receta_id: row.receta_id,
    ingrediente_id: row.ingrediente_id,
    cantidad_usada: row.cantidad_usada,
    medida: row.medida,
    nombre: row.ingredientes?.nombre,
    precio_ingrediente: row.ingredientes?.precio,
    medida_ingrediente: row.ingredientes?.medida,
    cantidad_ingrediente: row.ingredientes?.cantidad,
    tipo_ingrediente: row.ingredientes?.tipo,
  };
}

export const recetasApi = {
  async listar(categoria) {
    let query = supabase.from('recetas').select('*').order('nombre');
    if (categoria) query = query.eq('categoria', categoria);
    const { data, error } = await query;
    if (error) lanzarError(error.message);
    return data;
  },

  async obtener(id) {
    const { data: receta, error } = await supabase.from('recetas').select('*').eq('id', id).single();
    if (error) lanzarError('Receta no encontrada');

    const { data: filas, error: errFilas } = await supabase
      .from('receta_ingredientes')
      .select(
        'id, receta_id, ingrediente_id, cantidad_usada, medida, ingredientes(nombre, precio, medida, cantidad, tipo)'
      )
      .eq('receta_id', id);
    if (errFilas) lanzarError(errFilas.message);

    return { ...receta, ingredientes: filas.map(mapearFilaIngrediente) };
  },

  async crear(payload) {
    const { nombre, categoria, lotes, ingredientes, margen_base, margen_individual, precio_final } = payload;
    if (!nombre || !categoria || !Array.isArray(ingredientes) || ingredientes.length === 0) {
      lanzarError('Faltan campos requeridos (nombre, categoria, ingredientes)');
    }

    const { costoIngredientes, costoEnvase, costoTotal, detalle, precioMarkup, precioMargen, gananciaEstimada } =
      await calcularCostos({ ingredientes, categoria, margen_base, margen_individual });

    const { data: creada, error } = await supabase
      .from('recetas')
      .insert({
        nombre: nombre.trim(),
        categoria,
        lotes: lotes || 1,
        costo_ingredientes: costoIngredientes,
        costo_envase: costoEnvase,
        costo_total: costoTotal,
        margen_base: margen_base || (await obtenerMargenBaseCategoria(categoria)),
        margen_individual: margen_individual ?? null,
        precio_markup: precioMarkup,
        precio_margen: precioMargen,
        precio_final: precio_final ?? null,
        ganancia_estimada: gananciaEstimada,
      })
      .select()
      .single();
    if (error) lanzarError(error.message);

    const filas = detalle.map((item) => ({
      receta_id: creada.id,
      ingrediente_id: item.ingrediente_id,
      cantidad_usada: item.cantidad_usada,
      medida: item.medida,
    }));
    const { error: errIngredientes } = await supabase.from('receta_ingredientes').insert(filas);
    if (errIngredientes) lanzarError(errIngredientes.message);

    return creada;
  },

  async actualizar(id, payload) {
    const { data: existente, error: errExistente } = await supabase
      .from('recetas')
      .select('*')
      .eq('id', id)
      .single();
    if (errExistente) lanzarError('Receta no encontrada');

    const { nombre, categoria, lotes, ingredientes, margen_base, margen_individual, precio_final } = payload;
    const categoriaFinal = categoria || existente.categoria;

    let costoIngredientes = existente.costo_ingredientes;
    let costoEnvase = existente.costo_envase;
    let costoTotal = existente.costo_total;
    let precioMarkup = existente.precio_markup;
    let precioMargen = existente.precio_margen;
    let gananciaEstimada = existente.ganancia_estimada;
    let detalle = null;

    if (Array.isArray(ingredientes)) {
      const resultado = await calcularCostos({
        ingredientes,
        categoria: categoriaFinal,
        margen_base: margen_base ?? existente.margen_base,
        margen_individual: margen_individual ?? existente.margen_individual,
      });
      costoIngredientes = resultado.costoIngredientes;
      costoEnvase = resultado.costoEnvase;
      costoTotal = resultado.costoTotal;
      precioMarkup = resultado.precioMarkup;
      precioMargen = resultado.precioMargen;
      gananciaEstimada = resultado.gananciaEstimada;
      detalle = resultado.detalle;
    } else if (margen_base != null || margen_individual != null) {
      // No se reenviaron ingredientes (ej: desde la Calculadora), pero cambio
      // el margen: igual hay que recalcular precios sobre el costo ya guardado.
      const margenAplicado =
        margen_individual ?? margen_base ?? existente.margen_individual ?? existente.margen_base;
      precioMarkup = calcularPrecioMarkup(costoTotal, margenAplicado);
      precioMargen = calcularPrecioMargen(costoTotal, margenAplicado);
      gananciaEstimada = Number(((precioMargen ?? precioMarkup) - costoTotal).toFixed(2));
    }

    const { data: actualizada, error } = await supabase
      .from('recetas')
      .update({
        nombre: nombre ?? existente.nombre,
        categoria: categoriaFinal,
        lotes: lotes ?? existente.lotes,
        costo_ingredientes: costoIngredientes,
        costo_envase: costoEnvase,
        costo_total: costoTotal,
        margen_base: margen_base ?? existente.margen_base,
        margen_individual: margen_individual ?? existente.margen_individual,
        precio_markup: precioMarkup,
        precio_margen: precioMargen,
        precio_final: precio_final ?? existente.precio_final,
        ganancia_estimada: gananciaEstimada,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) lanzarError(error.message);

    if (detalle) {
      const { error: errBorrar } = await supabase.from('receta_ingredientes').delete().eq('receta_id', id);
      if (errBorrar) lanzarError(errBorrar.message);

      const filas = detalle.map((item) => ({
        receta_id: id,
        ingrediente_id: item.ingrediente_id,
        cantidad_usada: item.cantidad_usada,
        medida: item.medida,
      }));
      const { error: errIngredientes } = await supabase.from('receta_ingredientes').insert(filas);
      if (errIngredientes) lanzarError(errIngredientes.message);
    }

    return actualizada;
  },

  async eliminar(id) {
    const { error } = await supabase.from('recetas').delete().eq('id', id);
    if (error) lanzarError(error.message);
  },
};
