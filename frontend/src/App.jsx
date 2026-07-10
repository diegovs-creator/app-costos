import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Ingredientes from './pages/Ingredientes';
import Recetas from './pages/Recetas';
import RecetaForm from './pages/RecetaForm';
import Calculadora from './pages/Calculadora';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

export default function App() {
  const { sesion, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!sesion) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="ingredientes" element={<Ingredientes />} />
        <Route path="recetas" element={<Recetas />} />
        <Route path="recetas/nueva" element={<RecetaForm />} />
        <Route path="recetas/:id" element={<RecetaForm />} />
        <Route path="calculadora" element={<Calculadora />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  );
}
