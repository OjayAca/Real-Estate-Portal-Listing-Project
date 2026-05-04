import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Building2, CalendarDays, ChevronRight, Search, Star, UserRound, X } from 'lucide-react';
import ContactAgentModal from '../components/ContactAgentModal';
import InlineMessage from '../components/InlineMessage';

function formatRating(value) {
  return value ? Number(value).toFixed(1) : 'New';
}

function formatReviewDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AgentsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [contactAgent, setContactAgent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: '5', review_text: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set('search', search.trim());
    }

    setBusy(true);
    apiRequest(`/agents${params.toString() ? `?${params.toString()}` : ''}`)
      .then((data) => {
        setAgents(data.data || []);
      })
      .catch((error) => {
        setMessage(error.message);
        setMessageTone('error');
      })
      .finally(() => setBusy(false));
  }, [search]);

  useEffect(() => {
    if (!selected) {
      setSelectedDetail(null);
      return;
    }

    setDetailBusy(true);
    apiRequest(`/agents/${selected.agent_id}`)
      .then((data) => setSelectedDetail(data.data || null))
      .catch((error) => {
        setMessage(error.message);
        setMessageTone('error');
      })
      .finally(() => setDetailBusy(false));
  }, [selected]);

  const featuredAgencyName = useMemo(() => {
    return selectedDetail?.agent?.agency?.name || selectedDetail?.agent?.agency_name || 'Independent';
  }, [selectedDetail]);

  const submitReview = async () => {
    if (!selectedDetail?.agent) {
      return;
    }

    if (user?.role !== 'user') {
      setMessage('Log in as a buyer account to leave a review.');
      setMessageTone('warning');
      return;
    }

    setReviewBusy(true);
    try {
      await apiRequest(`/agents/${selectedDetail.agent.agent_id}/reviews`, {
        method: 'POST',
        body: {
          rating: Number(reviewForm.rating),
          review_text: reviewForm.review_text.trim() || null,
        },
      });

      const refreshed = await apiRequest(`/agents/${selectedDetail.agent.agent_id}`);
      setSelectedDetail(refreshed.data || null);
      setReviewForm({ rating: '5', review_text: '' });
      setMessage('Agent review saved.');
      setMessageTone('success');
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div className="page-shell page-grid animate-enter">
      <section className="section-panel">
        <div className="section-header-row" style={{ justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p className="eyebrow">Agent Directory</p>
            <h2 style={{ margin: '0.5rem 0 0' }}>Meet The Advisors Behind The Listings</h2>
          </div>
          <span className="result-count">{agents.length} agents</span>
        </div>

        <div className="agent-directory-filters" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
          <label>
            <span className="flex-row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Search size={14} aria-hidden="true" />
              Search Agents
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, location, or agency"
            />
          </label>
        </div>

        <InlineMessage
          icon={AlertCircle}
          message={message}
          tone={messageTone}
          onDismiss={() => setMessage('')}
        />

        {busy ? (
          <div className="agent-directory-grid">
            {[1, 2, 3].map((entry) => (
              <div className="agent-directory-card agent-listing-card-skeleton" key={entry} />
            ))}
          </div>
        ) : (
          <div className="agent-directory-grid">
            {agents.map((agent) => (
              <article className="agent-directory-card" key={agent.agent_id} onClick={() => setSelected(agent)}>
                <div className="agent-directory-card-top">
                  <div className="agent-avatar">
                    <UserRound size={24} aria-hidden="true" />
                  </div>
                  <div>
                    <h3>{agent.full_name}</h3>
                    <p>{agent.agency?.name || agent.agency_name || 'Independent Advisor'}</p>
                  </div>
                </div>

                <div className="agent-rating-row">
                  <span className="agent-rating-pill"><Star size={14} fill="currentColor" /> {formatRating(agent.average_rating)}</span>
                  <span>{agent.reviews_count} reviews</span>
                  <span>{agent.active_listings_count} active</span>
                  <span>{agent.sold_listings_count} sold</span>
                </div>

                <p className="agent-directory-bio">{agent.bio || 'No biography available yet.'}</p>

                <div className="chip-row" style={{ marginBottom: '1rem' }}>
                  {agent.featured_properties.slice(0, 2).map((property) => (
                    <span className="chip" key={property.property_id}>{property.title}</span>
                  ))}
                </div>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setContactAgent(agent);
                  }}
                >
                  Contact {agent.full_name}
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        )}

        {!busy && agents.length === 0 ? <p className="empty-copy">No approved agents matched the current search.</p> : null}
      </section>

      {contactAgent ? (
        <ContactAgentModal
          agent={contactAgent}
          onClose={() => setContactAgent(null)}
          onMessage={(nextMessage) => {
            setMessage(nextMessage);
            setMessageTone('success');
          }}
        />
      ) : null}

      {selected ? (
        <div className="drawer-overlay" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <aside className="drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <p className="eyebrow" style={{ margin: 0 }}>Agent Profile</p>
              <button
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="Close agent profile"
                style={{ width: '36px', height: '36px' }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="drawer-content">
              {detailBusy || !selectedDetail ? (
                <p className="empty-copy">Loading agent profile...</p>
              ) : (
                <>
                  <div className="agent-profile-hero">
                    <div className="agent-avatar agent-avatar-large">
                      <UserRound size={34} aria-hidden="true" />
                    </div>
                    <div>
                      <h2 style={{ margin: 0 }}>{selectedDetail.agent.full_name}</h2>
                      <p className="agent-profile-subtitle">{featuredAgencyName}</p>
                    </div>
                  </div>

                  <div className="agent-rating-row" style={{ marginBottom: '1.5rem' }}>
                    <span className="agent-rating-pill"><Star size={14} fill="currentColor" /> {formatRating(selectedDetail.agent.average_rating)}</span>
                    <span>{selectedDetail.agent.reviews_count} reviews</span>
                    <span>{selectedDetail.agent.active_listings_count} active listings</span>
                    <span>{selectedDetail.agent.sold_listings_count} sold listings</span>
                  </div>

                  <p className="property-copy" style={{ WebkitLineClamp: 'unset', marginBottom: '2rem' }}>
                    {selectedDetail.agent.bio || 'No biography available yet.'}
                  </p>

                  <dl className="detail-grid" style={{ marginTop: 0 }}>
                    <div><dt>Agency</dt><dd>{featuredAgencyName}</dd></div>
                    <div><dt>License</dt><dd>{selectedDetail.agent.license_number}</dd></div>
                    <div><dt>Email</dt><dd>{selectedDetail.agent.email}</dd></div>
                    <div><dt>Phone</dt><dd>{selectedDetail.agent.phone}</dd></div>
                  </dl>

                  <section className="agent-profile-section">
                    <div className="section-header-row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <p className="eyebrow">Availability</p>
                        <h3>Weekly Viewing Hours</h3>
                      </div>
                    </div>
                    <div className="agent-availability-list">
                      {(selectedDetail.availability || []).map((slot) => (
                        <div className="agent-availability-row" key={slot.id}>
                          <span>{slot.day_label}</span>
                          <strong>{slot.start_time} - {slot.end_time}</strong>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="agent-profile-section">
                    <p className="eyebrow">Listings</p>
                    <h3>Active Listings</h3>
                    <div className="agent-profile-properties">
                      {selectedDetail.active_listings.map((property) => (
                        <Link className="agent-profile-property" key={property.property_id} to="/properties">
                          <div className="agent-profile-property-image" style={property.featured_image ? { backgroundImage: `url(${property.featured_image})` } : undefined} />
                          <div>
                            <strong>{property.title}</strong>
                            <span>{property.city}, {property.province}</span>
                          </div>
                        </Link>
                      ))}
                      {selectedDetail.active_listings.length === 0 ? <p className="empty-copy" style={{ padding: '2rem' }}>No active listings right now.</p> : null}
                    </div>
                  </section>

                  <section className="agent-profile-section">
                    <p className="eyebrow">Track Record</p>
                    <h3>Sold Listings</h3>
                    <div className="agent-profile-properties">
                      {selectedDetail.sold_listings.map((property) => (
                        <div className="agent-profile-property" key={property.property_id}>
                          <div className="agent-profile-property-image" style={property.featured_image ? { backgroundImage: `url(${property.featured_image})` } : undefined} />
                          <div>
                            <strong>{property.title}</strong>
                            <span>{property.city}, {property.province}</span>
                          </div>
                        </div>
                      ))}
                      {selectedDetail.sold_listings.length === 0 ? <p className="empty-copy" style={{ padding: '2rem' }}>No sold listings have been published yet.</p> : null}
                    </div>
                  </section>

                  <section className="agent-profile-section">
                    <p className="eyebrow">Client Reviews</p>
                    <h3>Recent Feedback</h3>
                    <div className="agent-review-stack">
                      {selectedDetail.reviews.map((review) => (
                        <article className="agent-review-card" key={review.review_id}>
                          <div className="agent-rating-row" style={{ marginBottom: '0.75rem' }}>
                            <span className="agent-rating-pill"><Star size={14} fill="currentColor" /> {review.rating.toFixed ? review.rating.toFixed(1) : review.rating}</span>
                            <span>{review.user?.full_name || 'Verified buyer'}</span>
                            <span>{formatReviewDate(review.created_at)}</span>
                          </div>
                          <p>{review.review_text || 'No written review provided.'}</p>
                        </article>
                      ))}
                      {selectedDetail.reviews.length === 0 ? <p className="empty-copy" style={{ padding: '2rem' }}>No reviews yet.</p> : null}
                    </div>

                    {user?.role === 'user' && selectedDetail.can_review ? (
                      <div className="agent-review-form">
                        <label>
                          Rating
                          <select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}>
                            {[5, 4, 3, 2, 1].map((rating) => (
                              <option key={rating} value={rating}>{rating} Stars</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Review
                          <textarea
                            rows={4}
                            value={reviewForm.review_text}
                            onChange={(event) => setReviewForm((current) => ({ ...current, review_text: event.target.value }))}
                            placeholder="Share what the viewing experience was like."
                          />
                        </label>
                        <button className="primary-button" disabled={reviewBusy} onClick={submitReview} type="button">
                          {reviewBusy ? 'Saving Review...' : 'Submit Review'}
                        </button>
                      </div>
                    ) : user?.role === 'user' ? (
                      <div className="empty-copy" style={{ padding: '2rem', textAlign: 'center' }}>
                        <CalendarDays size={18} aria-hidden="true" />
                        <span>Submit an inquiry or request a viewing to unlock agent reviews.</span>
                        <button
                          className="ghost-button"
                          type="button"
                          style={{ marginTop: '0.75rem' }}
                          onClick={() => {
                            setSelected(null);
                            setContactAgent(selectedDetail.agent);
                          }}
                        >
                          Contact {selectedDetail.agent.full_name}
                        </button>
                      </div>
                    ) : (
                      <p className="empty-copy" style={{ padding: '2rem' }}>
                        <CalendarDays size={18} aria-hidden="true" />
                        Buyer accounts can leave reviews after completing a viewing.
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
