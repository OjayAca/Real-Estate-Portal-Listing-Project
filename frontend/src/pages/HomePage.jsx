import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import { ShieldCheck, Building, Zap, ArrowRight, UserPlus } from 'lucide-react';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    apiRequest('/properties?per_page=3')
      .then((data) => setFeatured(data.data || []))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div className="page-grid home-grid">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Discover Excellence</p>
          <h1>Refined Living, Digitally Realized.</h1>
          <p>
            An exclusive, role-based real estate platform built for seamless transactions, complete oversight, and extraordinary property discovery.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/properties">
              Explore listings 
              <ArrowRight size={18} />
            </Link>
            <Link className="ghost-button" to="/register">
              <UserPlus size={18} />
              Join the portal
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="metric-card">
            <div className="metric-icon accent">
              <ShieldCheck size={28} />
            </div>
            <div className="metric-info">
              <strong>Rigorous</strong>
              <span>Admin oversight</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon accent">
              <Building size={28} />
            </div>
            <div className="metric-info">
              <strong>Premium</strong>
              <span>Verified properties</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon accent">
              <Zap size={28} />
            </div>
            <div className="metric-info">
              <strong>Instant</strong>
              <span>Live notifications</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel" style={{ marginTop: '2rem' }}>
        <div className="section-header-row">
          <div>
            <p className="eyebrow">Curated Selection</p>
            <h2>Featured Properties</h2>
          </div>
          <Link className="text-button flex-row" style={{ gap: '0.25rem' }} to="/properties">
            View the collection
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="card-grid">
          {featured.map((property) => (
             <PropertyCard key={property.property_id} property={property} onView={() => null} />
          ))}
        </div>
      </section>
    </div>
  );
}
