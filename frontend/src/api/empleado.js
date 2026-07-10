// API para el rol "empleado": solo lee las vistas *_publico (sin precios/costos)
// y crea recetas a traves de la funcion crear_receta_empleado, que calcula el
// costo del lado del servidor sin devolver esos numeros al navegador.
import { supabase } from '../lib/supabaseClient';
import { normalizarTexto } from '../utils/texto';
import { lanzarError } from './errores';

export const empleadoApi = {
  async listarIngredientes(buscar) {
    const { data, error } = await supabase.from('ingredientes_publico').select('*').order('nombre');
    if (error) lanzarError(error.message);
    if (!buscar) return data;
    const buscado = normalizarTexto(buscar);
    return data.filter((i) => normalizarTexto(i.nombre).includes(buscado));
  },

  async listarRecetas() {
    const { data, error } = await supabase.from('recetas_publico').select('*').order('nombre');
    if (error) lanzarError(error.message);
    return data;
  },

  async obtenerReceta(id) {
    const { data: receta, error } = await supabase.from('recetas_publico').select('*').eq('id', id).single();
    if (error) lanzarError('Receta no encontrada');

    const { data: ingredientes, error: errIng } = await supabase
      .from('receta_ingredientes_publico')
      .select('*')
      .eq('receta_id', id);
    if (errIng) lanzarError(errIng.message);

    return { ...receta, ingredientes };
  },

  async crearReceta({ nombre, categoria, lotes, ingredientes, unidadVenta, mermaPct, tiempoHorneadoMin }) {
    const { data, error } = await supabase.rpc('crear_receta_empleado', {
      p_nombre: nombre,
      p_categoria: categoria,
      p_lotes: lotes || 1,
      p_ingredientes: ingredientes,
      p_unidad_venta: unidadVenta || 'unidades',
      p_merma_pct: unidadVenta === 'kilo' ? mermaPct : null,
      p_tiempo_horneado_min: tiempoHorneadoMin || null,
    });
    if (error) lanzarError(error.message);
    return data; // id de la receta creada
  },
};
