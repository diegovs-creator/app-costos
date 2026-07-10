import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Ingredientes from './pages/Ingredientes';
import Recetas from './pages/Recetas';
import RecetaForm from './pages/RecetaForm';
import Calculadora from './pages/Calculadora';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

export default function App() {
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
