import { Container } from 'react-bootstrap';
import Hero from '../components/Hero';

const LandingPage = () => {
  return (
    <div>
      <Hero />

      {/* FOOTER */}
      <footer className="text-center py-4" style={{ backgroundColor: '#6d71a3', color: 'white' }}>
        <Container>
          <p className="mb-0">
            &copy; 2026 Aplicación web de videos educativos ADS - ESCOM
          </p>
        </Container>
      </footer>
    </div>
  );
};

export default LandingPage;