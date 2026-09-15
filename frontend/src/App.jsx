import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import VerificarCorreoPage from './pages/verificarCorreoPage';
import SolicitarRecuperacionPage from './pages/RecuperacionPage';
import RestablecerPasswordPage from './pages/RestablecerPasswordPage';
import HomePage from './pages/HomePage';
import MisVideosPage from './pages/MisVideosPage';
import PerfilPage from './pages/PerfilPage';  // ← Nuevo
import { useAuth } from './hooks/useAuth';
import ConfiguracionPage from './pages/ConfiguracionPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <div className="app">
      <Routes>
        {/* ===== RUTAS PÚBLICAS ===== */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/verificar-correo" element={<VerificarCorreoPage />} />
        <Route path="/recuperar-password" element={<SolicitarRecuperacionPage />} />
        <Route path="/restablecer-password" element={<RestablecerPasswordPage />} />
        <Route path="/configuracion" element={<PrivateRoute><ConfiguracionPage/></PrivateRoute>} />

        {/* ===== RUTAS PRIVADAS ===== */}
        <Route
          path="/feed"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-videos"
          element={
            <PrivateRoute>
              <MisVideosPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/perfil/:nombre_usuario"
          element={
            <PrivateRoute>
              <PerfilPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;