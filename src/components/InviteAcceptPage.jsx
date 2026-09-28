import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Invite acceptance.
 *
 * The invitee arrives from the email link with a token (the Invite row's id).
 * Until this page existed, an invitee just signed up as an ordinary user and the
 * seat was never claimed — so Pro's team seats could not actually onboard anyone.
 *
 * Three states, and each one is explained rather than failing blankly:
 *   invalid   the token is unknown, cancelled, or already used
 *   signed out  create an account (carrying the token through signup) or sign in
 *   signed in   accept, and the seat's tier is granted
 */
const NAVY = '#0A0F1A';
const GOLD = '#D4AF37';
const BLUE = '#003A8C';

function tokenFrom(params) {
  return params.get('token') || params.get('invite') || '';
}

export default function InviteAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = tokenFrom(params);

  const [state, setState] = useState({ status: 'loading', invite: null, message: '' });
  const token0 = typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
  const signedIn = Boolean(token0);

  useEffect(() => {
    if (!token) {
      setState({ status: 'invalid', invite: null, message: 'This link is missing its invitation token.' });
      return;
    }
    let cancelled = false;
    fetch(`/api/invite/${encodeURIComponent(token)}`)
      .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (ok && body.valid) setState({ status: 'ready', invite: body, message: '' });
        else setState({ status: 'invalid', invite: body, message: body.message || 'This invitation is not valid.' });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'invalid', invite: null, message: 'Could not reach the server to check this invitation.' });
      });
    return () => { cancelled = true; };
  }, [token]);

  const accept = useCallback(async () => {
    setState((s) => ({ ...s, status: 'accepting' }));
    try {
      const res = await fetch(`/api/invite/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token0}` },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) {
        setState({ status: 'accepted', invite: state.invite, message: body.message || 'Invitation accepted.' });
        window.setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        setState({ status: 'invalid', invite: state.invite, message: body.message || 'Could not accept this invitation.' });
      }
    } catch {
      setState({ status: 'invalid', invite: state.invite, message: 'Could not reach the server.' });
    }
  }, [navigate, state.invite, token, token0]);

  const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 32, maxWidth: 520, width: '100%' };
  const primary = { display: 'block', width: '100%', textAlign: 'center', background: GOLD, color: NAVY, borderRadius: 10, padding: '13px 18px', fontWeight: 900, fontSize: 15, textDecoration: 'none', border: 'none', cursor: 'pointer' };
  const secondary = { ...primary, background: '#fff', color: BLUE, border: '1px solid #CBD5E1' };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: '#B8960C', marginBottom: 8 }}>
          The Grants Master
        </div>

        {state.status === 'loading' && <h1 style={{ fontSize: 24, fontWeight: 900, color: NAVY }}>Checking your invitation…</h1>}

        {(state.status === 'ready' || state.status === 'accepting') && state.invite && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: NAVY, margin: '0 0 10px' }}>
              {state.invite.inviterName ? `${state.invite.inviterName} invited you` : 'You have been invited'}
            </h1>
            <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.7, margin: '0 0 6px' }}>
              Joining as <strong>{state.invite.email}</strong>
              {state.invite.tier ? <> on the <strong>{String(state.invite.tier).replace(/_/g, ' ')}</strong> plan</> : null}.
            </p>
            <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6, margin: '0 0 22px' }}>
              Accepting grants the seat&apos;s plan to your account.
            </p>

            {signedIn ? (
              <button type="button" onClick={accept} disabled={state.status === 'accepting'} style={primary}>
                {state.status === 'accepting' ? 'Accepting…' : 'Accept invitation'}
              </button>
            ) : (
              <>
                <Link to={`/signup?invite=${encodeURIComponent(token)}`} style={primary}>Create your account</Link>
                <div style={{ height: 10 }} />
                <Link to={`/login?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`} style={secondary}>
                  I already have an account
                </Link>
                <p style={{ color: '#64748B', fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                  Your invitation is carried through sign-up — you will join the team seat automatically.
                </p>
              </>
            )}
          </>
        )}

        {state.status === 'accepted' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: NAVY, margin: '0 0 10px' }}>You&apos;re in 🎉</h1>
            <p style={{ color: '#475569', fontSize: 15 }}>{state.message} Taking you to your dashboard…</p>
          </>
        )}

        {state.status === 'invalid' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: NAVY, margin: '0 0 10px' }}>We couldn&apos;t use this invitation</h1>
            <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.7 }}>{state.message}</p>
            <p style={{ color: '#64748B', fontSize: 13, marginTop: 14 }}>
              Ask whoever invited you to send a new one, or{' '}
              <Link to="/signup" style={{ color: BLUE, fontWeight: 800 }}>sign up directly</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
