import { useState } from 'react';
import { apiRequest } from '../api/client';
import { ArrowRight, CheckCircle2, ClipboardCheck, Home, MapPin, ShieldCheck, Sparkles } from 'lucide-react';

const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];
const TIMELINES = ['Immediately', '1-3 months', '3-6 months', 'Just exploring'];

const emptyLeadForm = {
  full_name: '',
  email: '',
  phone: '',
  property_type: 'House',
  address_line: '',
  city: '',
  province: '',
  expected_price: '',
  timeline: '1-3 months',
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
            Address Line
            <input required value={values.address_line} onChange={(event) => updateValue('address_line', event.target.value)} />
            {getFieldError(fieldErrors, 'address_line') ? <span className="field-error">{getFieldError(fieldErrors, 'address_line')}</span> : null}
          </label>

          <div className="two-up seller-form-grid">
            <label>
              City
              <input required value={values.city} onChange={(event) => updateValue('city', event.target.value)} />
              {getFieldError(fieldErrors, 'city') ? <span className="field-error">{getFieldError(fieldErrors, 'city')}</span> : null}
            </label>
            <label>
              Province
              <input required value={values.province} onChange={(event) => updateValue('province', event.target.value)} />
              {getFieldError(fieldErrors, 'province') ? <span className="field-error">{getFieldError(fieldErrors, 'province')}</span> : null}
            </label>
            <label>
              Expected Price
              <input min="1" type="number" value={values.expected_price} onChange={(event) => updateValue('expected_price', event.target.value)} placeholder="Optional" />
              {getFieldError(fieldErrors, 'expected_price') ? <span className="field-error">{getFieldError(fieldErrors, 'expected_price')}</span> : null}
            </label>
            <label>
              Timeline
              <select value={values.timeline} onChange={(event) => updateValue('timeline', event.target.value)}>
                {TIMELINES.map((timeline) => <option key={timeline} value={timeline}>{timeline}</option>)}
              </select>
              {getFieldError(fieldErrors, 'timeline') ? <span className="field-error">{getFieldError(fieldErrors, 'timeline')}</span> : null}
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
