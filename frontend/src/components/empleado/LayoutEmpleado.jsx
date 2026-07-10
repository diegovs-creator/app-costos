import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LayoutEmpleado() {
  const { sesion, cerrarSesion } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">🥐</span>
          <span className="font-semibold text-gray-900">Recetas</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-400 sm:inline">{sesion?.user?.email}</span>
          <button
            type="button"
            onClick={cerrarSesion}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
