import { supabase } from '../lib/supabaseClient';
import { lanzarError } from './errores';

const CATEGORIAS_DB = ['Pasteleria', 'Panaderia', 'Comida Rapida'];

export const reportesApi = {
  async dashboard() {
    const { data: recetas, error: errRecetas } = await supabase.from('recetas').select('*');
    if (errRecetas) lanzarError(errRecetas.message);

    const { count: totalIngredientes, error: errIngredientes } = await supabase
      .from('ingredientes')
      .select('*', { count: 'exact', head: true });
    if (errIngredientes) lanzarError(errIngredientes.message);

    const totalProductos = recetas.length;
    const gananciaTotal = Number(recetas.reduce((acc, r) => acc + Number(r.ganancia_estimada), 0).toFixed(2));
    const costoPromedio =
      totalProductos > 0
        ? Number((recetas.reduce((acc, r) => acc + Number(r.costo_total), 0) / totalProductos).toFixed(2))
        : 0;

    const porCategoria = CATEGORIAS_DB.map((categoria) => {
      const filas = recetas.filter((r) => r.categoria === categoria);
      return {
        categoria,
        productos: filas.length,
        costo_total: Number(filas.reduce((acc, r) => acc + Number(r.costo_total), 0).toFixed(2)),
        ganancia_total: Number(filas.reduce((acc, r) => acc + Number(r.ganancia_estimada), 0).toFixed(2)),
      };
    });

    const productosRecientes = [...recetas]
      .sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        nombre: r.nombre,
        categoria: r.categoria,
        costo_total: r.costo_total,
        precio_markup: r.precio_markup,
        precio_margen: r.precio_margen,
        ganancia_estimada: r.ganancia_estimada,
      }));

    return {
      totalProductos,
      totalIngredientes: totalIngredientes ?? 0,
      gananciaTotal,
      costoPromedio,
      porCategoria,
      productosRecientes,
    };
  },

  async costoPrecio(params = {}) {
    let query = supabase.from('recetas').select('*').order('fecha_creacion', { ascending: false });
    if (params.categoria) query = query.eq('categoria', params.categoria);
    if (params.desde) query = query.gte('fecha_creacion', params.desde);
    if (params.hasta) query = query.lte('fecha_creacion', params.hasta);

    const { data, error } = await query;
    if (error) lanzarError(error.message);
    return data;
  },

  async ingredientesCaros() {
    const { data, error } = await supabase.from('ingredientes').select('*');
    if (error) lanzarError(error.message);

    return data
      .map((i) => ({ ...i, precio_unitario: Number((i.precio / i.cantidad).toFixed(4)) }))
      .sort((a, b) => b.precio_unitario - a.precio_unitario)
      .slice(0, 10);
  },
};
