import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import { ShieldCheck, Building, Zap, ArrowRight, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';

const CARDS_PER_PAGE = 3;

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest('/properties?per_page=12')
      .then((data) => setFeatured(data.data || []))
      .catch(() => setFeatured([]));
  }, []);

  const totalPages = Math.ceil(featured.length / CARDS_PER_PAGE);
  const visible = featured.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);

  const handleView = (property) => {
    navigate('/properties', { state: { selectedProperty: property } });
  };

  return (
    <div className="page-grid home-grid animate-enter">
      <section className="hero-panel animate-delay-1">
        <div className="hero-copy">
          <p className="eyebrow">Discover Excellence</p>
          <h1>Refined Living, Digitally Realized.</h1>
          <p>
            An exclusive, role-based real estate platform built for seamless transactions, complete oversight, and extraordinary property discovery.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/properties" aria-label="Explore properties">
              Explore listings
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="ghost-button" to="/register" aria-label="Join the portal as an agent or buyer">
              <UserPlus size={18} aria-hidden="true" />
              Join the portal
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="metric-card animate-enter animate-delay-2">
            <div className="metric-icon accent" aria-hidden="true">
              <ShieldCheck size={28} />
            </div>
            <div className="metric-info">
              <strong>Rigorous</strong>
              <span>Admin oversight</span>
            </div>
          </div>
          <div className="metric-card animate-enter animate-delay-3">
            <div className="metric-icon accent" aria-hidden="true">
              <Building size={28} />
            </div>
            <div className="metric-info">
              <strong>Premium</strong>
              <span>Verified properties</span>
            </div>
          </div>
          <div className="metric-card animate-enter" style={{ animationDelay: '0.4s' }}>
            <div className="metric-icon accent" aria-hidden="true">
              <Zap size={28} />
            </div>
            <div className="metric-info">
              <strong>Instant</strong>
              <span>Live notifications</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel animate-enter" style={{ marginTop: '2rem', animationDelay: '0.5s' }}>
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
            <Link className="text-button flex-row" style={{ gap: '0.4rem' }} to="/properties" aria-label="View all featured property collections">
              View the collection
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="card-grid" style={{ marginTop: '2.5rem' }}>
          {visible.map((property) => (
            <PropertyCard key={property.property_id} property={property} onView={handleView} />
          ))}
        </div>
      </section>
    </div>
  );
}
