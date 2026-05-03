import { useState } from 'react';
import { apiRequest } from '../api/client';
import { ArrowRight, CheckCircle2, ClipboardCheck, Home, MapPin, Minus, Plus, ShieldCheck, Sparkles } from 'lucide-react';

const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];
const HOME_CONDITIONS = [
  'Excellent - like new, move-in ready',
  'Good - well maintained, minor cosmetic needs',
  'Fair - functional, but needs updates',
  'Poor - needs major repairs/renovation',
  'New Construction',
];

const emptyLeadForm = {
  full_name: '',
  email: '',
  phone: '',
  property_type: 'House',
  property_address: '',
  bedrooms: 1,
  bathrooms: 1,
  home_size: '',
  lot_size: '',
  condition_of_home: 'Good - well maintained, minor cosmetic needs',
  expected_price: '',
  notes: '',
};

function getFieldError(errors, field) {
  return errors[field]?.[0] || '';
}

export default function SellPage() {
  const [values, setValues] = useState(emptyLeadForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateValue = (field, nextValue) => {
    setValues((current) => ({ ...current, [field]: nextValue }));
  };

  const adjustCount = (field, delta) => {
    setValues((current) => ({
      ...current,
      [field]: Math.max(0, (current[field] || 0) + delta),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFieldErrors({});
    setMessage('');

    try {
      await apiRequest('/seller-leads', {
        method: 'POST',
        body: {
          ...values,
          home_size: values.home_size === '' ? null : Number(values.home_size),
          lot_size: values.lot_size === '' ? null : Number(values.lot_size),
          expected_price: values.expected_price === '' ? null : Number(values.expected_price),
        },
      });
      setSubmitted(true);
      setValues(emptyLeadForm);
      setMessage('Your request was received. An EstateFlow agent will review the property details and follow up.');
    } catch (error) {
      setFieldErrors(error.details || {});
      setMessage(error.message || 'Unable to submit your request right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sell-page animate-enter">
      <section className="sell-hero">
        <div className="sell-hero-copy">
          <p className="eyebrow">Sell With EstateFlow</p>
          <h1>Get your property priced, positioned, and introduced to qualified buyers.</h1>
          <p>
            Share the basics and we will route your home to an agent who can evaluate local demand, pricing, and launch timing.
          </p>
          <div className="sell-trust-strip">
            <span><ShieldCheck size={16} aria-hidden="true" /> Verified agent network</span>
            <span><MapPin size={16} aria-hidden="true" /> Local market context</span>
            <span><ClipboardCheck size={16} aria-hidden="true" /> Clear next steps</span>
          </div>
        </div>

        <form className="seller-lead-form" onSubmit={handleSubmit}>
          <div className="seller-lead-form-header">
            <p className="eyebrow">Seller Consultation</p>
            <h2>Tell us about the property</h2>
          </div>

          {message ? (
            <p className={`inline-message ${submitted ? 'seller-success' : ''}`} role="status">
              {submitted ? <CheckCircle2 size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
              {message}
            </p>
          ) : null}

          <div className="two-up seller-form-grid">
            <label>
              Full Name
              <input required value={values.full_name} onChange={(event) => updateValue('full_name', event.target.value)} />
              {getFieldError(fieldErrors, 'full_name') ? <span className="field-error">{getFieldError(fieldErrors, 'full_name')}</span> : null}
            </label>
            <label>
              Email
              <input required type="email" value={values.email} onChange={(event) => updateValue('email', event.target.value)} />
              {getFieldError(fieldErrors, 'email') ? <span className="field-error">{getFieldError(fieldErrors, 'email')}</span> : null}
            </label>
            <label>
              Phone
              <input required value={values.phone} onChange={(event) => updateValue('phone', event.target.value)} />
              {getFieldError(fieldErrors, 'phone') ? <span className="field-error">{getFieldError(fieldErrors, 'phone')}</span> : null}
            </label>
            <label>
              Property Type
              <select value={values.property_type} onChange={(event) => updateValue('property_type', event.target.value)}>
                {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              {getFieldError(fieldErrors, 'property_type') ? <span className="field-error">{getFieldError(fieldErrors, 'property_type')}</span> : null}
            </label>
          </div>

          <label>
            Property Address
            <input required value={values.property_address} onChange={(event) => updateValue('property_address', event.target.value)} />
            {getFieldError(fieldErrors, 'property_address') ? <span className="field-error">{getFieldError(fieldErrors, 'property_address')}</span> : null}
          </label>

          <div className="two-up seller-form-grid">
            <div className="label">
              Bedrooms
              <div className="seller-form-counter">
                <button type="button" className="seller-form-counter-btn" onClick={() => adjustCount('bedrooms', -1)} disabled={values.bedrooms <= 0}>
                  <Minus size={16} />
                </button>
                <span>{values.bedrooms}</span>
                <button type="button" className="seller-form-counter-btn" onClick={() => adjustCount('bedrooms', 1)}>
                  <Plus size={16} />
                </button>
              </div>
              {getFieldError(fieldErrors, 'bedrooms') ? <span className="field-error">{getFieldError(fieldErrors, 'bedrooms')}</span> : null}
            </div>

            <div className="label">
              Bathrooms
              <div className="seller-form-counter">
                <button type="button" className="seller-form-counter-btn" onClick={() => adjustCount('bathrooms', -1)} disabled={values.bathrooms <= 0}>
                  <Minus size={16} />
                </button>
                <span>{values.bathrooms}</span>
                <button type="button" className="seller-form-counter-btn" onClick={() => adjustCount('bathrooms', 1)}>
                  <Plus size={16} />
                </button>
              </div>
              {getFieldError(fieldErrors, 'bathrooms') ? <span className="field-error">{getFieldError(fieldErrors, 'bathrooms')}</span> : null}
            </div>

            <label>
              Home Size
              <div className="seller-form-input-unit">
                <input type="number" min="1" value={values.home_size} onChange={(event) => updateValue('home_size', event.target.value)} placeholder="0" />
                <span className="unit">sqm</span>
              </div>
              {getFieldError(fieldErrors, 'home_size') ? <span className="field-error">{getFieldError(fieldErrors, 'home_size')}</span> : null}
            </label>

            <label>
              Lot Size
              <div className="seller-form-input-unit">
                <input type="number" min="1" value={values.lot_size} onChange={(event) => updateValue('lot_size', event.target.value)} placeholder="0" />
                <span className="unit">sqm</span>
              </div>
              {getFieldError(fieldErrors, 'lot_size') ? <span className="field-error">{getFieldError(fieldErrors, 'lot_size')}</span> : null}
            </label>

            <label>
              Condition of Home
              <select value={values.condition_of_home} onChange={(event) => updateValue('condition_of_home', event.target.value)}>
                {HOME_CONDITIONS.map((cond) => <option key={cond} value={cond}>{cond}</option>)}
              </select>
              {getFieldError(fieldErrors, 'condition_of_home') ? <span className="field-error">{getFieldError(fieldErrors, 'condition_of_home')}</span> : null}
            </label>

            <label>
              Expected Price
              <input min="1" type="number" value={values.expected_price} onChange={(event) => updateValue('expected_price', event.target.value)} placeholder="Optional" />
              {getFieldError(fieldErrors, 'expected_price') ? <span className="field-error">{getFieldError(fieldErrors, 'expected_price')}</span> : null}
            </label>
          </div>

          <label>
            Notes
            <textarea rows={4} value={values.notes} onChange={(event) => updateValue('notes', event.target.value)} placeholder="Renovations, occupancy status, documents, or pricing questions." />
            {getFieldError(fieldErrors, 'notes') ? <span className="field-error">{getFieldError(fieldErrors, 'notes')}</span> : null}
          </label>

          <button className="primary-button seller-submit" disabled={busy} type="submit">
            {busy ? 'Submitting...' : 'Request Seller Review'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      </section>

      <section className="page-shell sell-info-grid">
        <div>
          <p className="eyebrow">Process</p>
          <h2>From valuation to launch</h2>
          <div className="sell-process-list">
            {[
              ['1', 'Share the property basics and your selling timeline.'],
              ['2', 'An agent reviews comparable listings, location demand, and presentation needs.'],
              ['3', 'You receive a recommended pricing and launch path before going live.'],
            ].map(([step, copy]) => (
              <div className="sell-process-row" key={step}>
                <span>{step}</span>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sell-evaluation-panel">
          <p className="eyebrow">Evaluation Focus</p>
          <h2>What agents evaluate</h2>
          <div className="sell-evaluation-list">
            <span><Home size={16} aria-hidden="true" /> Property condition, type, and usable area</span>
            <span><MapPin size={16} aria-hidden="true" /> Location strength and nearby demand drivers</span>
            <span><Sparkles size={16} aria-hidden="true" /> Pricing signals, staging needs, and listing readiness</span>
          </div>
        </div>
      </section>
    </div>
  );
}
