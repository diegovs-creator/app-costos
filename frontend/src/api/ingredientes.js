import { supabase } from '../lib/supabaseClient';
import { normalizarTexto } from '../utils/texto';
import { lanzarError } from './errores';

const TIPOS_VALIDOS = ['ingrediente', 'envase'];

export const ingredientesApi = {
  async listar(params = {}) {
    let query = supabase.from('ingredientes').select('*').order('nombre');
    if (params.tipo) query = query.eq('tipo', params.tipo);

    const { data, error } = await query;
    if (error) lanzarError(error.message);

    if (params.buscar) {
      const buscado = normalizarTexto(params.buscar);
      return data.filter((i) => normalizarTexto(i.nombre).includes(buscado));
    }
    return data;
  },

  async obtener(id) {
    const { data: ingrediente, error } = await supabase.from('ingredientes').select('*').eq('id', id).single();
    if (error) lanzarError('Ingrediente no encontrado');

    const { data: historial, error: errHistorial } = await supabase
      .from('historial_precios')
      .select('*')
      .eq('ingrediente_id', id)
      .order('fecha', { ascending: false });
    if (errHistorial) lanzarError(errHistorial.message);

    return { ...ingrediente, historial_precios: historial };
  },

  async crear(data) {
    const { nombre, precio, medida, cantidad, tipo } = data;
    if (!nombre || precio == null || !medida || cantidad == null) {
      lanzarError('Faltan campos requeridos');
    }
    if (precio < 0 || cantidad <= 0) {
      lanzarError('Precio o cantidad invalidos');
    }
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      lanzarError(`tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);
    }

    const { data: creado, error } = await supabase
      .from('ingredientes')
      .insert({ nombre: nombre.trim(), precio, medida, cantidad, tipo: tipo || 'ingrediente' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') lanzarError('Ya existe un ingrediente con ese nombre');
      lanzarError(error.message);
    }

    const { error: errHistorial } = await supabase
      .from('historial_precios')
      .insert({ ingrediente_id: creado.id, precio });
    if (errHistorial) lanzarError(errHistorial.message);

    return creado;
  },

  async actualizar(id, data) {
    const { data: existente, error: errExistente } = await supabase
      .from('ingredientes')
      .select('*')
      .eq('id', id)
      .single();
    if (errExistente) lanzarError('Ingrediente no encontrado');

    const { nombre, precio, medida, cantidad, tipo } = data;
    if (precio != null && precio < 0) lanzarError('Precio invalido');
    if (cantidad != null && cantidad <= 0) lanzarError('Cantidad invalida');
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      lanzarError(`tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);
    }

    const { data: actualizado, error } = await supabase
      .from('ingredientes')
      .update({
        nombre: nombre ?? existente.nombre,
        precio: precio ?? existente.precio,
        medida: medida ?? existente.medida,
        cantidad: cantidad ?? existente.cantidad,
        tipo: tipo ?? existente.tipo,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) lanzarError(error.message);

    if (precio != null && precio !== existente.precio) {
      const { error: errHistorial } = await supabase
        .from('historial_precios')
        .insert({ ingrediente_id: id, precio });
      if (errHistorial) lanzarError(errHistorial.message);
    }

    return actualizado;
  },

  async eliminar(id) {
    const { error } = await supabase.from('ingredientes').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        lanzarError('No se puede eliminar: el ingrediente esta en uso por recetas');
      }
      lanzarError(error.message);
    }
  },
};
