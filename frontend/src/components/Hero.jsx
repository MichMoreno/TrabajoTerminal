// frontend/src/components/Hero.jsx
import { useRef, useLayoutEffect, useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import gsap from 'gsap';
import FeatureCarousel from './FeatureCarousel';

const titleWords = ['Aplicación', 'web', 'de', 'videos', 'educativos', 'ADS'];

const Hero = () => {
  const sectionRef = useRef(null);
  const heroRef = useRef(null);
  const badgeRef = useRef(null);
  const wordsRef = useRef([]);
  const formRef = useRef(null);
  const visualRef = useRef(null);
  const subtitleRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.fromTo(badgeRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
        .fromTo(wordsRef.current, { yPercent: 120 }, { yPercent: 0, duration: 1, stagger: 0.08 }, '-=0.2')
        .fromTo(formRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.5')
        .fromTo(visualRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.6')
        .fromTo(subtitleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4');

      const moveOrb1X = gsap.quickTo(orb1Ref.current, 'x', { duration: 0.8, ease: 'power3.out' });
      const moveOrb1Y = gsap.quickTo(orb1Ref.current, 'y', { duration: 0.8, ease: 'power3.out' });
      const moveOrb2X = gsap.quickTo(orb2Ref.current, 'x', { duration: 1.1, ease: 'power3.out' });
      const moveOrb2Y = gsap.quickTo(orb2Ref.current, 'y', { duration: 1.1, ease: 'power3.out' });

      const handleMouseMove = (e) => {
        const { innerWidth, innerHeight } = window;
        const relX = (e.clientX / innerWidth - 0.5) * 2;
        const relY = (e.clientY / innerHeight - 0.5) * 2;
        moveOrb1X(relX * 40);
        moveOrb1Y(relY * 40);
        moveOrb2X(relX * -30);
        moveOrb2Y(relY * -30);
      };

      sectionRef.current.addEventListener('mousemove', handleMouseMove);
      return () => sectionRef.current?.removeEventListener('mousemove', handleMouseMove);
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Correo o contraseña incorrectos.');
        setLoading(false);
        return;
      }

      login(data.usuario, data.token);
      navigate('/feed');
    } catch {
      setError('No se pudo conectar con el servidor.');
      setLoading(false);
    }
  };

  return (
    <section className="hero-section" ref={sectionRef}>
      <div className="hero-inner" ref={heroRef}>
        <div className="hero-orb hero-orb-1" ref={orb1Ref} />
        <div className="hero-orb hero-orb-2" ref={orb2Ref} />
        <Container>
          {/* Badge + título: fila propia, ancho completo */}
          <Row>
            <Col>
              <span className="hero-badge" ref={badgeRef}>Trabajo Terminal</span>
              <h1
                className="hero-title hero-title-compact"
                aria-label={titleWords.join(' ')}
              >
                {titleWords.map((word, i) => (
                  <span className="word-mask" key={i} aria-hidden="true">
                    <span
                      className={`word ${word === 'ADS' ? 'word-accent' : ''}`}
                      ref={(el) => (wordsRef.current[i] = el)}
                    >
                      {word}
                    </span>
                  </span>
                ))}
              </h1>
            </Col>
          </Row>

          {/* Login + carrusel: única fila, sin nada más compitiendo por altura */}
          <Row className="align-items-start gy-4">
            <Col md={6}>
              <div className="hero-login" ref={formRef}>
                <h2 className="hero-login-title">Iniciar sesión</h2>
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Correo institucional</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="correo@alumno.ipn.mx"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      required
                      disabled={loading}
                    />
                  </div>

                  {error && <p className="register-error">{error}</p>}

                  <Button
                    className="hero-btn-primary w-100"
                    size="lg"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
                  </Button>

                  <p className="text-center mt-3 mb-2">
                    <Link to="/recuperar-password" className="hero-login-link" style={{ fontSize: '0.9rem' }}>
                      ¿Has olvidado tu contraseña?
                    </Link>
                  </p>

                  <p className="text-center mt-2 hero-login-footer">
                    ¿No tienes cuenta?{' '}
                    <Link to="/registro" className="hero-login-link">Regístrate</Link>
                  </p>
                </form>
              </div>
            </Col>

            <Col md={6} className="text-center">
              <div className="hero-visual" ref={visualRef}>
                <FeatureCarousel />
              </div>
              <p className="hero-subtitle hero-subtitle-below" ref={subtitleRef}>
                Aprende, crea y comparte conocimiento sobre Análisis y Diseño de Sistemas
                con herramientas de inteligencia artificial y con videos educativos por los 
                mismos alumnos.
              </p>
            </Col>
          </Row>
        </Container>
      </div>
    </section>
  );
};

export default Hero;