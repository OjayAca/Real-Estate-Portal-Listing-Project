import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import heroImg from '../assets/homepage-hero.png';

const CARDS_PER_PAGE = 3;
const HERO_TABS = ['Buy', 'Rent', 'Sell'];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState('Buy');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest('/properties?per_page=12&listing_purpose=sale')
      .then((data) => setFeatured(data.data || []))
      .catch(() => setFeatured([]));
  }, []);

  const totalPages = Math.ceil(featured.length / CARDS_PER_PAGE);
  const visible = featured.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);

  const handleView = (property) => {
    navigate(property.listing_purpose === 'rent' ? '/rent' : '/buy', { state: { selectedProperty: property } });
  };

  const handleInquire = (property) => {
    if (!user) {
      navigate('/login', {
        state: {
          from: {
            pathname: property.listing_purpose === 'rent' ? '/rent' : '/buy',
            search: '',
          },
        },
      });
      return;
    }

    handleView(property);
  };

  const handleTabClick = (tab) => {
    if (tab === 'Sell') {
      navigate('/sell');
      return;
    }

    setActiveTab(tab);
  };

  const handleSearch = () => {
    if (activeTab === 'Sell') {
      navigate('/sell');
      return;
    }

    const targetPath = activeTab === 'Rent' ? '/rent' : '/buy';
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }
    navigate(`${targetPath}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="animate-enter">
      <section className="realtor-hero">
        <div
          className="realtor-hero-bg"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className="realtor-hero-content">
          <h1>Connecting buyers, sellers, and experts<br />for effortless real estate success</h1>

          <div className="hero-tabs">
            {HERO_TABS.map((tab) => (
              <button
                key={tab}
                className={`hero-tab ${activeTab === tab ? 'hero-tab-active' : ''}`}
                onClick={() => handleTabClick(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="hero-search-bar">
            <input
              type="text"
              className="hero-search-input"
              placeholder="Address, School, City, Zip or Neighborhood"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button className="hero-search-btn" onClick={handleSearch} type="button">
              <Search size={20} />
              <span>Search</span>
            </button>
          </div>

          <div className="hero-browse-row">
            Browse homes in EstateFlow
          </div>
        </div>
      </section>

      <section className="page-shell section-panel animate-enter" style={{ animationDelay: '0.5s' }}>
        <div className="section-header-row">
          <div>
            <p className="eyebrow">Curated Selection</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 300, margin: '0.5rem 0 0' }}>Featured Properties</h2>
          </div>
          <div className="flex-row" style={{ gap: '1.5rem' }}>
            {totalPages > 1 && (
              <div className="flex-row" style={{ gap: '0.5rem' }}>
                <button
                  className="nav-arrow"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label="Previous properties"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="nav-arrow"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  aria-label="Next properties"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
            <button className="text-button flex-row" style={{ gap: '0.4rem' }} onClick={() => navigate('/buy')} aria-label="View all featured property collections">
              View the collection
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="card-grid" style={{ marginTop: '2.5rem' }}>
          {visible.map((property) => (
            <PropertyCard
              key={property.property_id}
              property={property}
              onView={handleView}
              onInquire={handleInquire}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
