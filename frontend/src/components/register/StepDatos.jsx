import { useState } from 'react';
import { Button } from 'react-bootstrap';

const BOLETA_REGEX = /^\d{10}$/;

const StepDatos = ({ formData, updateField, onNext }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombreCompleto.trim() || !formData.numeroBoleta.trim()) {
      setError('Completa ambos campos para continuar.');
      return;
    }
    if (!BOLETA_REGEX.test(formData.numeroBoleta.trim())) {
      setError('La boleta debe tener 10 dígitos.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verificar-identidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boleta: formData.numeroBoleta.trim(),
          nombreCompleto: formData.nombreCompleto.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ocurrió un error al verificar tus datos.');
        setLoading(false);
        return;
      }

      updateField('tokenVerificacion', data.tokenVerificacion);
      onNext();
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="nombreCompleto" className="form-label">Nombre completo</label>
        <input
          type="text"
          className="form-control"
          id="nombreCompleto"
          value={formData.nombreCompleto}
          onChange={(e) => updateField('nombreCompleto', e.target.value)}
          placeholder="Inicia por nombres o por apellidos"
        />
      </div>
      <div className="mb-3">
        <label htmlFor="numeroBoleta" className="form-label">Número de boleta</label>
        <input
          type="text"
          className="form-control"
          id="numeroBoleta"
          value={formData.numeroBoleta}
          onChange={(e) => updateField('numeroBoleta', e.target.value)}
          placeholder="10 dígitos"
          maxLength={10}
        />
      </div>

      {error && <p className="register-error">{error}</p>}

      <Button type="submit" className="hero-btn-primary w-100" size="lg" disabled={loading}>
        {loading ? 'Verificando…' : 'Continuar'}
      </Button>
    </form>
  );
};

export default StepDatos;