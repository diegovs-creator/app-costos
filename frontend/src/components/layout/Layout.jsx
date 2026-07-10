import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/ingredientes', label: 'Ingredientes', icon: '🧂' },
  { to: '/recetas', label: 'Recetas / Productos', icon: '🍞' },
  { to: '/calculadora', label: 'Calculadora de precios', icon: '🧮' },
  { to: '/reportes', label: 'Reportes', icon: '📈' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️' },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-500 text-white'
                : 'text-gray-600 hover:bg-brand-50 hover:text-brand-700'
            }`
          }
        >
          <span className="text-lg" aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-200">
          <span className="text-2xl">🥐</span>
          <span className="font-semibold text-gray-900">App Costos</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavItems />
        </div>
      </aside>

      {/* Navbar móvil */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥐</span>
          <span className="font-semibold text-gray-900">App Costos</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Abrir menú"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Menú móvil deslizable */}
      {menuAbierto && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuAbierto(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-200">
              <span className="font-semibold text-gray-900">Menú</span>
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Cerrar menú"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavItems onNavigate={() => setMenuAbierto(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
