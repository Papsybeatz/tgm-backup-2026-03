import { useState } from 'react';

const MIN_QUOTE = 40;

const EMPTY = { quote: '', role: '', orgType: '', region: '', email: '' };

/**
 * Collects real quotes from real users.
 *
 * Two rules, enforced here and again on the server:
 *   1. Submissions are anonymous by default — role, org type and region only.
 *      The email is for us to ask follow-up questions, never to publish.
 *   2. Nothing is published on submit. Every row lands as 'pending' and only an
 *      admin approval can move it to 'approved'. There is no client-side flag
 *      that can publish anything.
 */
export default function ShareStoryForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ status: 'idle', message: '' });

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();

    if (form.quote.trim().length < MIN_QUOTE) {
      setState({
        status: 'error',
        message: `A little more detail, please — at least ${MIN_QUOTE} characters.`,
      });
      return;
    }

    setState({ status: 'sending', message: '' });

    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));

      // Assert on the response body, not res.ok. A 200 that is not a real
      // success must never render as "submitted" — that was the exact bug the
      // waitlist form shipped with.
      if (!body || body.success !== true) {
        setState({
          status: 'error',
          message: body.message || 'Could not save that right now.',
        });
        return;
      }

      setState({
        status: 'done',
        message: body.message || 'Thank you — we read every one.',
      });
      setForm(EMPTY);
    } catch {
      setState({ status: 'error', message: 'Could not reach the server. Please try again.' });
    }
  }

  if (!open) {
    return (
      <p style={{ marginTop: 18, marginBottom: 0 }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#003A8C',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Using TGM? Tell us your story →
        </button>
      </p>
    );
  }

  if (state.status === 'done') {
    return (
      <p
        style={{
          marginTop: 18,
          padding: '14px 16px',
          borderRadius: 12,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#166534',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {state.message}
      </p>
    );
  }

  const input = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #CBD5E1',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
  const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 };

  return (
    <form onSubmit={submit} style={{ marginTop: 18, display: 'grid', gap: 12, maxWidth: 560 }}>
      <div>
        <label style={label} htmlFor="ts-quote">
          What did TGM do for you?
        </label>
        <textarea
          id="ts-quote"
          rows={4}
          value={form.quote}
          onChange={field('quote')}
          style={{ ...input, resize: 'vertical' }}
          placeholder="In your own words — what changed, and what were you doing before?"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={label} htmlFor="ts-role">
            Your role
          </label>
          <input
            id="ts-role"
            value={form.role}
            onChange={field('role')}
            style={input}
            placeholder="Executive Director"
          />
        </div>
        <div>
          <label style={label} htmlFor="ts-org">
            Type of organisation
          </label>
          <input
            id="ts-org"
            value={form.orgType}
            onChange={field('orgType')}
            style={input}
            placeholder="Youth services nonprofit"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={label} htmlFor="ts-region">
            Region
          </label>
          <input
            id="ts-region"
            value={form.region}
            onChange={field('region')}
            style={input}
            placeholder="Texas"
          />
        </div>
        <div>
          <label style={label} htmlFor="ts-email">
            Email (never published)
          </label>
          <input
            id="ts-email"
            type="email"
            value={form.email}
            onChange={field('email')}
            style={input}
            placeholder="you@example.org"
          />
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#64748b' }}>
        We publish quotes anonymously — role, organisation type and region only. Your name and
        email are never shown, and nothing goes live until we have read it.
      </p>

      {state.status === 'error' ? (
        <p style={{ margin: 0, fontSize: 13, color: '#B91C1C' }}>{state.message}</p>
      ) : null}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="submit"
          disabled={state.status === 'sending'}
          style={{
            background: '#003A8C',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '11px 20px',
            fontWeight: 700,
            fontSize: 14,
            cursor: state.status === 'sending' ? 'wait' : 'pointer',
          }}
        >
          {state.status === 'sending' ? 'Sending…' : 'Send it'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: 'none',
            color: '#475569',
            border: '1px solid #CBD5E1',
            borderRadius: 10,
            padding: '11px 18px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
