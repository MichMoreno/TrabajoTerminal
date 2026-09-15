import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const RestablecerPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  // Inicializar AMBOS estados directamente (sin useEffect)
  const [tokenValido, setTokenValido] = useState(() => (token ? null : false));
  const [error, setError] = useState(() =>
    token ? '' : 'No se proporcionó un token de recuperación.'
  );

  // useEffect solo para validar el token en el servidor (lógica asíncrona)
  useEffect(() => {
    // Early return: si no hay token, el estado ya está configurado
    if (!token) return;

    let ignore = false;

    const validarToken = async () => {
      try {
        const response = await fetch(`/api/auth/recuperar-validar/${token}`);
        const data = await response.json();

        if (ignore) return;

        if (response.ok) {
          setTokenValido(true);
        } else {
          setTokenValido(false);
          setError(data.error || 'Token inválido o expirado.');
        }
      } catch {
        if (ignore) return;
        setTokenValido(false);
        setError('Error de conexión al validar el token.');
      }
    };

    validarToken();

    return () => {
      ignore = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!PASSWORD_REGEX.test(nuevaPassword)) {
      setError('La contraseña debe tener mínimo 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial.');
      return;
    }

    if (nuevaPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/recuperar-restablecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al restablecer la contraseña.');
        setLoading(false);
        return;
      }

      setExito(true);
    } catch {
      setError('No se pudo conectar con el servidor.');
      setLoading(false);
    }
  };

  // Validando token
  if (tokenValido === null) {
    return (
      <section className="register-page">
        <div className="register-page-orb register-page-orb-1" />
        <div className="register-page-orb register-page-orb-2" />
        <div className="register-page-inner">
          <div className="hero-login register-card text-center">
            <h2 className="hero-login-title">Validando token…</h2>
            <p>Por favor espera un momento.</p>
          </div>
        </div>
      </section>
    );
  }

  // Token inválido
  if (tokenValido === false) {
    return (
      <section className="register-page">
        <div className="register-page-orb register-page-orb-1" />
        <div className="register-page-orb register-page-orb-2" />
        <div className="register-page-inner">
          <Link to="/" className="register-back-link">← Volver al inicio</Link>
          <div className="hero-login register-card text-center">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
            <h2 className="hero-login-title" style={{ color: '#c0392b' }}>Token inválido</h2>
            <p>{error}</p>
            <p style={{ color: '#999', fontSize: '0.85rem' }}>
              Solicita un nuevo enlace de recuperación.
            </p>
            <Link
              to="/recuperar-password"
              className="hero-btn-primary w-100 mt-4 d-block text-center"
              style={{
                textDecoration: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                display: 'block'
              }}
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Éxito
  if (exito) {
    return (
      <section className="register-page">
        <div className="register-page-orb register-page-orb-1" />
        <div className="register-page-orb register-page-orb-2" />
        <div className="register-page-inner">
          <div className="hero-login register-card text-center">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
            <h2 className="hero-login-title" style={{ color: '#2e7d32' }}>
              ¡Contraseña actualizada!
            </h2>
            <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <Link
              to="/"
              className="hero-btn-primary w-100 mt-4 d-block text-center"
              style={{
                textDecoration: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                display: 'block'
              }}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Formulario de nueva contraseña
  return (
    <section className="register-page">
      <div className="register-page-orb register-page-orb-1" />
      <div className="register-page-orb register-page-orb-2" />
      <div className="register-page-inner">
        <Link to="/" className="register-back-link">← Volver al inicio</Link>

        <div className="hero-login register-card">
          <h2 className="hero-login-title">Nueva contraseña</h2>
          <p style={{ color: '#4a4a5a', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Ingresa tu nueva contraseña. Asegúrate de que cumpla con los requisitos de seguridad.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="nuevaPassword" className="form-label">Nueva contraseña</label>
              <input
                type="password"
                className="form-control"
                id="nuevaPassword"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                disabled={loading}
                required
              />
              <small className="form-text text-muted">
                Mínimo 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial.
              </small>
            </div>

            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Confirmar contraseña</label>
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {error && <p className="register-error">{error}</p>}

            <Button
              type="submit"
              className="hero-btn-primary w-100"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Actualizar contraseña'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default RestablecerPasswordPage;