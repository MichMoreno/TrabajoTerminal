import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const SolicitarRecuperacionPage = () => {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validar correo institucional
    if (!correo.endsWith('@alumno.ipn.mx')) {
      setError('Usa tu correo institucional (@alumno.ipn.mx).');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/recuperar-solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al procesar la solicitud.');
        setLoading(false);
        return;
      }

      setEnviado(true);
      setMensaje(data.mensaje || 'Se ha enviado un enlace de recuperación a tu correo.');
    } catch {
      setError('No se pudo conectar con el servidor.');
      setLoading(false);
    }
  };

  // Pantalla de éxito
  if (enviado) {
    return (
      <section className="register-page">
        <div className="register-page-orb register-page-orb-1" />
        <div className="register-page-orb register-page-orb-2" />
        <div className="register-page-inner">
          <Link to="/" className="register-back-link">← Volver al inicio</Link>

          <div className="hero-login register-card text-center">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
            <h2 className="hero-login-title">Revisa tu correo</h2>
            <p style={{ color: '#4a4a5a', fontSize: '0.95rem' }}>
              {mensaje}
            </p>
            <p style={{ color: '#999', fontSize: '0.85rem', marginTop: '1rem' }}>
              El enlace expirará en <strong>1 hora</strong>. Si no lo ves, revisa tu carpeta de spam.
            </p>
            <Link to="/" className="hero-btn-primary w-100 mt-4 d-block text-center" 
              style={{ 
                textDecoration: 'none', 
                padding: '0.75rem',
                borderRadius: '8px',
                display: 'block'
              }}
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Formulario
  return (
    <section className="register-page">
      <div className="register-page-orb register-page-orb-1" />
      <div className="register-page-orb register-page-orb-2" />
      <div className="register-page-inner">
        <Link to="/" className="register-back-link">← Volver al inicio</Link>

        <div className="hero-login register-card">
          <h2 className="hero-login-title">Recuperar contraseña</h2>
          <p style={{ color: '#4a4a5a', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Ingresa tu correo institucional y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="correo" className="form-label">Correo institucional</label>
              <input
                type="email"
                className="form-control"
                id="correo"
                placeholder="correo@alumno.ipn.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
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
              {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </Button>

            <p className="text-center mt-3 hero-login-footer">
              ¿Recordaste tu contraseña?{' '}
              <Link to="/" className="hero-login-link">Inicia sesión</Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SolicitarRecuperacionPage;