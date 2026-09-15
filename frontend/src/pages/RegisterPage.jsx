import { Link } from 'react-router-dom';
import RegisterCard from '../components/register/RegisterCard';

const RegisterPage = () => {
  return (
    <section className="register-page">
      <div className="register-page-orb register-page-orb-1" />
      <div className="register-page-orb register-page-orb-2" />

      <div className="register-page-inner">
        <Link to="/" className="register-back-link">← Volver al inicio</Link>
        <RegisterCard />
      </div>
    </section>
  );
};


export default RegisterPage;