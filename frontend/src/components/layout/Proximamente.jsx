export default function Proximamente({ titulo, descripcion }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{titulo}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-lg font-medium text-gray-900">Sección en construcción</p>
        <p className="mt-1 text-sm text-gray-500">{descripcion}</p>
      </div>
    </div>
  );
}
