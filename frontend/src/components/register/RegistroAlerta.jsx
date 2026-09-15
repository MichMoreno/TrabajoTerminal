import { Spinner } from 'react-bootstrap';

const RegistroAlerta = ({ show }) => {
  if (!show) return null;

  return (
    <div className="alert alert-info" role="alert" style={{ borderRadius: '12px' }}>
      <h6 className="alert-heading d-flex align-items-center mb-2">
        <Spinner
          animation="border"
          size="sm"
          className="me-2"
          style={{ color: '#0c5460' }}
        />
        Validando tu nombre de usuario
      </h6>
      <p className="mb-2" style={{ fontSize: '0.9rem' }}>
        Estamos verificando que el nombre de usuario sea apropiado y no esté en uso.
        Esto puede tomar unos segundos.
      </p>
      <hr />
      <p className="mb-0" style={{ fontSize: '0.8rem' }}>
        Por favor, no cierres esta ventana mientras se completa la validación.
      </p>
    </div>
  );
};

export default RegistroAlerta;