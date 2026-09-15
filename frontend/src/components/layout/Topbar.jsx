// frontend/src/components/layout/Topbar.jsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import buscadorIcon from '../../assets/icons/buscadorIcon.png';

const Topbar = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ✅ Estado inicial calculado directamente desde la URL (sin useEffect)
  const [query, setQuery] = useState(() => searchParams.get('q') || '');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/feed?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/feed');
    }
  };

  return (
    <header className="topbar">
      <form className="topbar-search" onSubmit={handleSearch}>
        {/* ✅ Usar tu ícono en lugar del emoji */}
        <img
          src={buscadorIcon}
          alt="Buscar"
          className="topbar-search-icon"
        />
        <input
          type="text"
          placeholder="Buscar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="topbar-search-input"
        />
      </form>
    </header>
  );
};

export default Topbar;