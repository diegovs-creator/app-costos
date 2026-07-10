import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

async function obtenerRol(userId) {
  const { data } = await supabase.from('perfiles').select('rol').eq('id', userId).single();
  return data?.rol ?? null;
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!activo) return;
      setSesion(data.session);
      setRol(data.session ? await obtenerRol(data.session.user.id) : null);
      setCargando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_evento, nuevaSesion) => {
      if (!activo) return;
      setSesion(nuevaSesion);
      setRol(nuevaSesion ? await obtenerRol(nuevaSesion.user.id) : null);
    });

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const cerrarSesion = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ sesion, rol, cargando, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
