import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { reportesApi } from '../api/client';
import { formatoMoneda, formatoFecha, CATEGORIAS } from '../utils/formato';
import { exportarCsv } from '../utils/exportarCsv';
import IngredienteFormModal from '../components/ingredientes/IngredienteFormModal';

function BotonExportar({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
    >
      ⬇ Exportar CSV
    </button>
  );
}

const FILTROS_CATEGORIA = [{ valor: '', label: 'Todas' }, ...CATEGORIAS];

const COLOR_COSTO = '#2a78d6';
const COLOR_GANANCIA = '#1baf7a';
const COLOR_MUTED = '#898781';
const COLOR_GRID = '#e1e0d9';
const COLOR_AXIS = '#c3c2b7';

function formatoCompacto(valor) {
  return formatoMoneda.format(valor).replace('CLP', '').trim();
}

function TooltipPersonalizado({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-gray-900">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatoMoneda.format(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Reportes() {
  const [productos, setProductos] = useState(null);
  const [ingredientesCaros, setIngredientesCaros] = useState(null);
  const [error, setError] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ingredienteAEditar, setIngredienteAEditar] = useState(null);

  const cargar = useCallback(() => {
    const params = {};
    if (filtroCategoria) params.categoria = filtroCategoria;
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    reportesApi
      .costoPrecio(params)
      .then(setProductos)
      .catch(() => setError('No se pudo conectar con el backend.'));
  }, [filtroCategoria, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cargarIngredientesCaros = useCallback(() => {
    reportesApi.ingredientesCaros().then(setIngredientesCaros).catch(() => {});
  }, []);

  useEffect(() => {
    cargarIngredientesCaros();
  }, [cargarIngredientesCaros]);

  const datosGrafico = CATEGORIAS.map((c) => {
    const productosCategoria = (productos || []).filter((p) => p.categoria === c.valor);
    return {
      categoria: c.label,
      Costo: Number(productosCategoria.reduce((acc, p) => acc + p.costo_total, 0).toFixed(2)),
      Ganancia: Number(productosCategoria.reduce((acc, p) => acc + p.ganancia_estimada, 0).toFixed(2)),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
        <p className="mt-1 text-sm text-gray-500">Costos, precios, ganancias e ingredientes más caros.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTROS_CATEGORIA.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltroCategoria(f.valor)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filtroCategoria === f.valor ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-gray-500">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-gray-500">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Grafico por categoria */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Costo vs. ganancia por categoría</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosGrafico} barGap={2} barCategoryGap="24%" margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLOR_GRID} />
              <XAxis
                dataKey="categoria"
                tick={{ fill: COLOR_MUTED, fontSize: 12 }}
                axisLine={{ stroke: COLOR_AXIS }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: COLOR_MUTED, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatoCompacto}
                width={56}
              />
              <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Legend wrapperStyle={{ fontSize: 13, color: '#52514e' }} />
              <Bar dataKey="Costo" fill={COLOR_COSTO} radius={[4, 4, 0, 0]} maxBarSize={24}>
                <LabelList dataKey="Costo" position="top" formatter={formatoCompacto} fill="#52514e" fontSize={11} />
              </Bar>
              <Bar dataKey="Ganancia" fill={COLOR_GANANCIA} radius={[4, 4, 0, 0]} maxBarSize={24}>
                <LabelList dataKey="Ganancia" position="top" formatter={formatoCompacto} fill="#52514e" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla costo vs precio */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Costo vs. precio de venta por producto</h2>
          {productos && productos.length > 0 && (
            <BotonExportar
              onClick={() =>
                exportarCsv(
                  'costo-vs-precio.csv',
                  [
                    { header: 'Producto', accessor: (p) => p.nombre },
                    { header: 'Categoría', accessor: (p) => p.categoria },
                    { header: 'Costo', accessor: (p) => p.costo_total },
                    { header: 'Precio', accessor: (p) => p.precio_final ?? p.precio_margen },
                    { header: 'Ganancia estimada', accessor: (p) => p.ganancia_estimada },
                    { header: 'Creado', accessor: (p) => formatoFecha(p.fecha_creacion) },
                  ],
                  productos
                )
              }
            />
          )}
        </div>
        {!productos && <p className="px-5 py-4 text-sm text-gray-500">Cargando...</p>}
        {productos && productos.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-500">No hay productos para este filtro.</p>
        )}
        {productos && productos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-4 py-2.5">Categoría</th>
                  <th className="px-4 py-2.5">Costo</th>
                  <th className="px-4 py-2.5">Precio</th>
                  <th className="px-4 py-2.5">Ganancia</th>
                  <th className="px-4 py-2.5">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.categoria}</td>
                    <td className="px-4 py-2.5 text-gray-700">{formatoMoneda.format(p.costo_total)}</td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {formatoMoneda.format(p.precio_final ?? p.precio_margen)}
                    </td>
                    <td className="px-4 py-2.5 text-green-700">{formatoMoneda.format(p.ganancia_estimada)}</td>
                    <td className="px-4 py-2.5 text-gray-400">{formatoFecha(p.fecha_creacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabla ingredientes mas caros */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Ingredientes más caros (por unidad)</h2>
          {ingredientesCaros && ingredientesCaros.length > 0 && (
            <BotonExportar
              onClick={() =>
                exportarCsv(
                  'ingredientes-mas-caros.csv',
                  [
                    { header: 'Nombre', accessor: (i) => i.nombre },
                    { header: 'Precio', accessor: (i) => i.precio },
                    { header: 'Presentación', accessor: (i) => `${i.cantidad} ${i.medida}` },
                    { header: 'Precio unitario', accessor: (i) => i.precio_unitario },
                  ],
                  ingredientesCaros
                )
              }
            />
          )}
        </div>
        {!ingredientesCaros && <p className="px-5 py-4 text-sm text-gray-500">Cargando...</p>}
        {ingredientesCaros && ingredientesCaros.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-500">Todavía no hay ingredientes cargados.</p>
        )}
        {ingredientesCaros && ingredientesCaros.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Precio</th>
                  <th className="px-4 py-2.5">Presentación</th>
                  <th className="px-4 py-2.5">Precio unitario</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ingredientesCaros.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{i.nombre}</td>
                    <td className="px-4 py-2.5 text-gray-700">{formatoMoneda.format(i.precio)}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {i.cantidad} {i.medida}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {formatoMoneda.format(i.precio_unitario)} / {i.medida}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setIngredienteAEditar(i)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ingredienteAEditar && (
        <IngredienteFormModal
          ingrediente={ingredienteAEditar}
          onClose={() => setIngredienteAEditar(null)}
          onGuardado={() => {
            setIngredienteAEditar(null);
            cargarIngredientesCaros();
          }}
        />
      )}
    </div>
  );
}
