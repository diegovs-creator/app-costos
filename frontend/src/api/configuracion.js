import { supabase } from '../lib/supabaseClient';
import { lanzarError } from './errores';

export const configuracionApi = {
  async obtenerMargenes() {
    const { data, error } = await supabase.from('configuracion_categoria').select('*');
    if (error) lanzarError(error.message);
    return data;
  },

  async actualizarMargen(categoria, margen_base) {
    if (margen_base == null || margen_base < 0) lanzarError('margen_base invalido');

    const { data, error } = await supabase
      .from('configuracion_categoria')
      .update({ margen_base })
      .eq('categoria', categoria)
      .select()
      .single();
    if (error) lanzarError('Categoria no encontrada');

    return data;
  },

  async obtenerCostoHoraHorno() {
    const { data, error } = await supabase.from('configuracion_negocio').select('costo_hora_horno').single();
    if (error) lanzarError(error.message);
    return data.costo_hora_horno;
  },

  async actualizarCostoHoraHorno(costo_hora_horno) {
    if (costo_hora_horno == null || costo_hora_horno < 0) lanzarError('Costo por hora invalido');

    const { data, error } = await supabase
      .from('configuracion_negocio')
      .update({ costo_hora_horno })
      .eq('id', true)
      .select('costo_hora_horno')
      .single();
    if (error) lanzarError(error.message);

    return data.costo_hora_horno;
  },
};
