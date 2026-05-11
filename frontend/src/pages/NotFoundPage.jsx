import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="page-shell">
      <div className="section-panel text-center">
        <h1 style={{ fontSize: '8rem', fontWeight: '300', margin: '0', color: 'var(--brand-base)' }}>404</h1>
        <h2 style={{ fontSize: '2rem', fontWeight: '400', marginBottom: '1.5rem' }}>Page Not Found</h2>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '40ch', marginInline: 'auto' }}>
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link to="/" className="primary-button">
          Back to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
