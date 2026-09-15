import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import TerminosCondiciones from './TerminosCondiciones';
import RegistroAlerta from './RegistroAlerta';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const StepCredenciales = ({ formData, updateField, onBack }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showTerminos, setShowTerminos] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Completa todos los campos.');
      return;
    }else if (!formData.email.endsWith('@alumno.ipn.mx')) {
      setError('Usa tu correo institucional (@alumno.ipn.mx).');
      return;
    }else if (!PASSWORD_REGEX.test(formData.password)) {
      setError('La contraseña debe tener mínimo 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial.');
      return;
    }else if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }else if (!aceptaTerminos) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    setError('');
    setLoading(true); // Activa la alerta (porque RegistroAlerta depende de loading)

    try {
      const response = await fetch('/api/auth/registro-completo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenRegistro: formData.tokenRegistro,
          nombreUsuario: formData.username,
          correo: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ocurrió un error al completar tu registro.');
        setLoading(false);
        return;
      }

      setResultado(data);
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
      setLoading(false);
    }
  };

  // PANTALLA DE ÉXITO
  if (resultado) {
    return (
      <div className="register-success">
        <p>{resultado.mensaje}</p>
        {resultado.correo_enviado ? (
          <p>Revisa <strong>{resultado.usuario?.correo}</strong> para activar tu cuenta.</p>
        ) : (
          <p className="scan-status-warning">
            Tu cuenta se creó, pero no pudimos enviar el correo de verificación. Intenta iniciar sesión más tarde o contacta soporte.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ALERTA DE VALIDACIÓN (solo se muestra cuando loading = true) */}
      <RegistroAlerta show={loading} />

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="username" className="form-label">Nombre de usuario</label>
          <input
            type="text"
            className="form-control"
            id="username"
            value={formData.username}
            onChange={(e) => updateField('username', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Correo institucional</label>
          <input
            type="email"
            className="form-control"
            id="email"
            placeholder="correo@alumno.ipn.mx"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Contraseña</label>
          <input
            type="password"
            className="form-control"
            id="password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            disabled={loading}
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
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            disabled={loading}
          />
        </div>

        {/* CHECKBOX DE TÉRMINOS Y CONDICIONES */}
        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            id="aceptaTerminos"
            checked={aceptaTerminos}
            onChange={(e) => setAceptaTerminos(e.target.checked)}
            disabled={loading}
            label={
              <span style={{ fontSize: '0.9rem', color: '#4a4a5a' }}>
                Acepto los{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTerminos(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b45f52',
                    textDecoration: 'underline',
                    padding: 0,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  términos y condiciones
                </button>
              </span>
            }
          />
        </Form.Group>

        {error && <p className="register-error">{error}</p>}

        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={onBack}
            className="w-50"
            disabled={loading}
          >
            Atrás
          </Button>
          <Button
            type="submit"
            className="hero-btn-primary w-50"
            disabled={loading || !aceptaTerminos}
          >
            {loading ? 'Registrando…' : 'Registrarse'}
          </Button>
        </div>
      </form>

      {/* MODAL DE TÉRMINOS Y CONDICIONES */}
      <TerminosCondiciones
        show={showTerminos}
        onHide={() => setShowTerminos(false)}
      />
    </>
  );
};

export default StepCredenciales;