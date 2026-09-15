import { useState } from 'react';
import StepDatos from './StepDatos';
import StepEscaneo from './StepEscaneo';
import StepCredenciales from './StepCredenciales';

const RegisterCard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    numeroBoleta: '',
    tokenVerificacion: '',
    tokenRegistro: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="hero-login register-card">
      <h2 className="hero-login-title">Registro</h2>

      <div className="register-steps">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`register-step-dot ${step >= n ? 'active' : ''}`} />
        ))}
      </div>

      {step === 1 && (
        <StepDatos formData={formData} updateField={updateField} onNext={() => setStep(2)} />
      )}

      {step === 2 && (
        <StepEscaneo
          formData={formData}
          updateField={updateField}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepCredenciales formData={formData} updateField={updateField} onBack={() => setStep(2)} />
      )}
    </div>
  );
};

export default RegisterCard;