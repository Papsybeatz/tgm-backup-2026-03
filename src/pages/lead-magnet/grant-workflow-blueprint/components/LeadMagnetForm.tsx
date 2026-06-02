import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FormState {
  name: string;
  email: string;
}

interface FieldError {
  name?: string;
  email?: string;
}

function validate(fields: FormState): FieldError {
  const errors: FieldError = {};
  if (!fields.name.trim()) errors.name = 'Name is required';
  if (!fields.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Enter a valid email address';
  }
  return errors;
}

export default function LeadMagnetForm() {
  const navigate = useNavigate();
  const [fields, setFields]   = useState<FormState>({ name: '', email: '' });
  const [errors, setErrors]   = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof FieldError]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const fieldErrors = validate(fields);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/lead-magnet/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:   fields.name.trim(),
          email:  fields.email.trim().toLowerCase(),
          source: 'grant-workflow-blueprint',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      navigate('/lead-magnet/grant-workflow-blueprint/success');
    } catch (err: any) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Name */}
      <div>
        <label style={labelStyle} htmlFor="lm-name">Full name</label>
        <input
          id="lm-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          value={fields.name}
          onChange={handleChange}
          disabled={loading}
          style={{
            ...inputStyle,
            borderColor: errors.name ? '#EF4444' : '#E5E7EB',
          }}
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle} htmlFor="lm-email">Work email</label>
        <input
          id="lm-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jane@nonprofit.org"
          value={fields.email}
          onChange={handleChange}
          disabled={loading}
          style={{
            ...inputStyle,
            borderColor: errors.email ? '#EF4444' : '#E5E7EB',
          }}
        />
        {errors.email && <p style={errorStyle}>{errors.email}</p>}
      </div>

      {/* Server error */}
      {serverError && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: '#DC2626',
        }}>
          {serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', padding: '14px 24px',
          background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #003A8C 0%, #0A0F1A 100%)',
          color: '#fff', fontWeight: 700, fontSize: 15,
          border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity .15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? (
          <>
            <Spinner />
            Sending…
          </>
        ) : (
          'Download the Blueprint →'
        )}
      </button>

      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
        No spam. Unsubscribe any time. We'll also send you occasional grant writing tips from TGM.
      </p>

    </form>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,.3)" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 14,
  border: '1px solid #E5E7EB', borderRadius: 8,
  outline: 'none', boxSizing: 'border-box',
  color: '#0A0F1A', background: '#FAFAFA',
  transition: 'border-color .15s',
};

const errorStyle: React.CSSProperties = {
  margin: '5px 0 0', fontSize: 12, color: '#EF4444',
};
