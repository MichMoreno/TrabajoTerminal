// frontend/src/pages/VerificarCorreoPage.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';

const VerificarCorreoPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Estado inicial calculado directamente (sin useEffect)
  const [estado, setEstado] = useState(() => (token ? 'verificando' : 'error'));
  const [mensaje, setMensaje] = useState(() =>
    token ? '' : 'No se proporcionó un token de verificación.'
  );

  useEffect(() => {
    if (!token) return; // Si no hay token, el estado inicial ya está listo

    const verificar = async () => {
      try {
        const response = await fetch(`/api/auth/verificar-correo/${token}`);
        const data = await response.json();

        if (response.ok) {
          setEstado('exito');
          setMensaje(data.mensaje || 'Correo verificado exitosamente.');
        } else {
          setEstado('error');
          setMensaje(data.error || 'Token inválido o expirado.');
        }
      } catch {
        setEstado('error');
        setMensaje('Error de conexión con el servidor.');
      }
    };

    verificar();
  }, [token]);

  return (
    <section className="register-page">
      <div className="register-page-orb register-page-orb-1" />
      <div className="register-page-orb register-page-orb-2" />

      <div className="register-page-inner">
        <div className="hero-login register-card text-center">
          {estado === 'verificando' && (
            <>
              <h2 className="hero-login-title">Verificando tu correo...</h2>
              <p>Por favor espera un momento.</p>
            </>
          )}

          {estado === 'exito' && (
            <>
              <h2 className="hero-login-title" style={{ color: '#2e7d32' }}>
                ¡Correo verificado!
              </h2>
              <p>{mensaje}</p>
              <Link to="/login">
                <Button className="hero-btn-primary w-100 mt-3" size="lg">
                  Iniciar sesión
                </Button>
              </Link>
            </>
          )}

          {estado === 'error' && (
            <>
              <h2 className="hero-login-title" style={{ color: '#c0392b' }}>
                Error
              </h2>
              <p>{mensaje}</p>
              <Link to="/">
                <Button className="hero-btn-primary w-100 mt-3" size="lg">
                  Volver al inicio
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default VerificarCorreoPage;