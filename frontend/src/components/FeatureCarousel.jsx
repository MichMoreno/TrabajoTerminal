import { useState, useEffect, useRef } from 'react';
import { featuresData } from '../data/featuresData';

const AUTO_MS = 4000;

const FeatureCarousel = () => {
  const [active, setActive] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setActive((prev) => (prev + 1) % featuresData.length);
      setProgressKey((k) => k + 1);
    }, AUTO_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [active]);

  const goTo = (index) => {
    clearTimeout(timeoutRef.current);
    setActive(index);
    setProgressKey((k) => k + 1);
  };

  const feature = featuresData[active];

  return (
    <div className="feature-carousel">
      <div className="feature-carousel-content" key={feature.id}>
        <img src={feature.icon} alt={feature.title} className="feature-carousel-icon" />
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </div>

      <div className="feature-carousel-dots">
        {featuresData.map((f, i) => (
          <button
            key={f.id}
            type="button"
            className={`feature-dot ${i === active ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Ver funcionalidad: ${f.title}`}
          >
            {i === active && (
              <span
                className="feature-dot-progress"
                key={progressKey}
                style={{ animationDuration: `${AUTO_MS}ms` }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FeatureCarousel;