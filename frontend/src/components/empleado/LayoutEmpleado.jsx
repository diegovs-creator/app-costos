import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Recetas', icon: '🍞', end: true },
  { to: '/produccion', label: 'Producción', icon: '📦' },
];

export default function LayoutEmpleado() {
  const { sesion, cerrarSesion } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🥐</span>
            <span className="font-semibold text-gray-900">App Costos</span>
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
        </div>
        <nav className="flex gap-1 px-4 pb-2 sm:px-6">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main>
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
