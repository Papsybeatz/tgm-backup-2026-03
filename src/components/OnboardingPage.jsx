import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import { useStripeCheckout } from '../hooks/useStripeCheckout';

const STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
  ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
];

const ROLES = [
  { id: 'nonprofit', label: 'Nonprofit' },
  { id: 'consultant', label: 'Consultant' },
  { id: 'agency', label: 'Agency / Multi-Client Team' },
  { id: 'small_business', label: 'Small Business / Startup' },
  { id: 'other', label: 'Other' },
];

const GRANT_VOLUMES = [
  { id: '0_2', label: '0-2' },
  { id: '3_10', label: '3-10' },
  { id: '10_25', label: '10-25' },
  { id: '25_plus', label: '25+' },
];

const URGENCIES = [
  { id: 'deadline', label: 'I have a deadline coming up' },
  { id: 'cycles', label: 'I am preparing for upcoming cycles' },
  { id: 'process', label: 'I want to improve my process' },
  { id: 'exploring', label: 'I am exploring tools' },
];

const PAIN_POINTS = [
  { id: 'finding_grants', label: 'Finding the right grants' },
  { id: 'writing_proposals', label: 'Writing proposals' },
  { id: 'improving_alignment', label: 'Improving alignment' },
  { id: 'fixing_drafts', label: 'Fixing weak drafts' },
  { id: 'managing_clients', label: 'Managing multiple clients' },
  { id: 'organizing_templates', label: 'Organizing templates' },
  { id: 'meeting_deadlines', label: 'Meeting deadlines' },
  { id: 'increasing_win_rates', label: 'Increasing win rates' },
];

const SECTORS = [
  'Arts & Culture',
  'Community Development',
  'Education',
  'Environment',
  'Healthcare',
  'Housing',
  'Research',
  'Small Business / Innovation',
  'Social Services',
  'Workforce Development',
  'Other',
];

const FUNDER_TYPES = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'government', label: 'Government' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'ny_funders', label: 'NY funders' },
  { id: 'federal_sbir_sttr', label: 'Federal (SBIR/STTR)' },
];

const TEAM_SIZES = ['1', '2-3', '4-10', '11-25', '25+'];

const INITIAL_FORM = {
  role: '',
  state: '',
  grantVolume: '',
  urgency: '',
  painPoints: [],
  organizationName: '',
  sector: '',
  teamSize: '',
  primaryFunderTypes: [],
};

const FIELD_STYLE = {
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,.2)',
  background: '#fff',
  color: '#0A0F1A',
  padding: 12,
  fontSize: 15,
};

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

function deriveProfile(form) {
  const nyMode = form.state === 'NY' || form.primaryFunderTypes.includes('ny_funders');
  const consultantMode = form.role === 'consultant' || form.painPoints.includes('managing_clients');
  const agencyMode = form.role === 'agency';
  const workspaceMode = agencyMode ? 'agency' : consultantMode ? 'consultant' : nyMode ? 'new_york' : 'standard';
  const pricingRecommendation = form.grantVolume === '25_plus'
    ? 'agency_unlimited'
    : agencyMode || consultantMode || ['10_25'].includes(form.grantVolume)
      ? 'agency_starter'
      : form.teamSize && !['1', '2-3'].includes(form.teamSize)
        ? 'pro'
        : form.grantVolume === '3_10'
          ? 'pro'
          : 'starter';

  return {
    ...form,
    nyMode,
    consultantMode,
    agencyMode,
    workspaceMode,
    pricingRecommendation,
    postOnboardingCta: form.urgency === 'deadline' ? 'start_workspace_now' : 'open_dashboard',
    stevePromptSet: {
      sector: form.sector || 'general',
      funderTypes: form.primaryFunderTypes,
      role: form.role,
      urgency: form.urgency,
    },
    checkmateRules: {
      stateAware: Boolean(form.state),
      nyAware: nyMode,
      sectorAware: Boolean(form.sector),
      funderAware: form.primaryFunderTypes.length > 0,
    },
  };
}

function OptionButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 12,
        border: active ? '1.5px solid #D4AF37' : '1px solid rgba(255,255,255,.14)',
        background: active ? 'rgba(212,175,55,.18)' : 'rgba(255,255,255,.055)',
        color: '#fff',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 15,
        fontWeight: 750,
      }}
    >
      {children}
    </button>
  );
}

function LifetimeBadge() {
  return (
    <p style={{ margin: '14px 0 0', textAlign: 'center', color: '#E8D28C', fontSize: 12, fontWeight: 800 }}>
      Lifetime Access Available - Limited to 200 users
    </p>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { startCheckout, loading: checkoutLoading } = useStripeCheckout();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [priceIds, setPriceIds] = useState({});

  useEffect(() => {
    fetch('/api/checkout/prices')
      .then((res) => res.json())
      .then((data) => setPriceIds(data.prices || {}))
      .catch(() => setPriceIds({}));
  }, []);

  const profile = useMemo(() => deriveProfile(form), [form]);
  const progress = (step / 5) * 100;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleArrayValue = (key, value) => {
    setForm((current) => {
      const list = current[key] || [];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  const canContinue = () => {
    if (step === 1) return Boolean(form.role);
    if (step === 2) return Boolean(form.state);
    if (step === 3) return Boolean(form.grantVolume && form.urgency);
    if (step === 4) return form.painPoints.length > 0;
    return Boolean(form.organizationName && form.sector && form.teamSize && form.primaryFunderTypes.length > 0);
  };

  const saveOnboarding = async () => {
    setSaving(true);
    setError('');
    const payload = deriveProfile(form);

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Could not save onboarding');

      const updatedUser = {
        ...user,
        ...(data.user || {}),
        onboardingCompleted: true,
        onboardingData: data.profile || payload,
        audienceRole: payload.role,
        location: payload.nyMode ? 'new_york' : payload.state,
        workspaceMode: payload.workspaceMode,
        pricingRecommendation: payload.pricingRecommendation,
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('tgm_onboarded', '1');
      localStorage.setItem('tgm_onboarding_profile', JSON.stringify(payload));
      localStorage.setItem('tgm_workspace_mode', payload.workspaceMode);
      localStorage.setItem('tgm_pricing_recommendation', payload.pricingRecommendation);
      localStorage.setItem('tgm_post_onboarding_cta', payload.postOnboardingCta);
      return payload;
    } catch (err) {
      setError(err.message || 'Could not save onboarding');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const enterWorkspace = async () => {
    const saved = await saveOnboarding();
    if (!saved) return;
    navigate((saved.postOnboardingCta === 'start_workspace_now' || saved.postOnboardingCta === 'start_draft_now') ? '/workspace/new' : '/dashboard');
  };

  const unlockLifetime = async () => {
    const saved = await saveOnboarding();
    if (!saved) return;
    if (priceIds.lifetime) startCheckout(priceIds.lifetime);
    else navigate('/pricing');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0F1A 0%, #003A8C 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      color: '#fff',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 760,
        background: 'rgba(10,15,26,.82)',
        border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 18,
        boxShadow: '0 24px 70px rgba(0,0,0,.42)',
        padding: '28px clamp(20px, 5vw, 44px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg,#D4AF37,#E8D28C)',
              color: '#0A0F1A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
            }}>
              GM
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>GrantsMaster</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.55)', fontWeight: 700 }}>Personalization setup</p>
            </div>
          </div>
          <span style={{ color: '#E8D28C', fontSize: 13, fontWeight: 900 }}>Step {step} of 5</span>
        </div>

        <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 999, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#D4AF37', transition: 'width .25s ease' }} />
        </div>

        {error && (
          <div style={{ marginBottom: 18, border: '1px solid rgba(248,113,113,.5)', background: 'rgba(127,29,29,.35)', borderRadius: 10, padding: 12, color: '#FECACA', fontSize: 13, fontWeight: 800 }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <section>
            <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 900 }}>Tell us who you are</h1>
            <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,.68)' }}>TGM will tune your workspace, prompts, funder logic, and plan guidance.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {ROLES.map((role) => (
                <OptionButton key={role.id} active={form.role === role.id} onClick={() => update('role', role.id)}>
                  {role.label}
                </OptionButton>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 900 }}>Where is your organization based?</h1>
            <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,.68)' }}>New York selections activate NY funder intelligence, compliance, fit scoring, templates, and deadlines.</p>
            <select
              value={form.state}
              onChange={(event) => update('state', event.target.value)}
              style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,.2)', background: '#fff', color: '#0A0F1A', padding: '14px 16px', fontSize: 15, fontWeight: 800 }}
            >
              <option value="">Select state</option>
              {STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 900 }}>What brings you to TGM today?</h1>
            <div style={{ display: 'grid', gap: 22 }}>
              <div>
                <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,.7)', fontWeight: 800 }}>How many grants do you write per year?</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  {GRANT_VOLUMES.map((volume) => (
                    <OptionButton key={volume.id} active={form.grantVolume === volume.id} onClick={() => update('grantVolume', volume.id)}>
                      {volume.label}
                    </OptionButton>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,.7)', fontWeight: 800 }}>What is your urgency?</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {URGENCIES.map((urgency) => (
                    <OptionButton key={urgency.id} active={form.urgency === urgency.id} onClick={() => update('urgency', urgency.id)}>
                      {urgency.label}
                    </OptionButton>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 900 }}>What do you need the most help with?</h1>
            <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,.68)' }}>Choose all that apply.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {PAIN_POINTS.map((point) => (
                <OptionButton key={point.id} active={form.painPoints.includes(point.id)} onClick={() => toggleArrayValue('painPoints', point.id)}>
                  {point.label}
                </OptionButton>
              ))}
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 900 }}>Set up your workspace</h1>
            <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,.68)' }}>These details power Steve, Checkmate, templates, funder rules, and your recommended next step.</p>
            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,.78)' }}>
                Organization name
                <input value={form.organizationName} onChange={(event) => update('organizationName', event.target.value)} style={FIELD_STYLE} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,.78)' }}>
                  Sector
                  <select value={form.sector} onChange={(event) => update('sector', event.target.value)} style={FIELD_STYLE}>
                    <option value="">Select sector</option>
                    {SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,.78)' }}>
                  Team size
                  <select value={form.teamSize} onChange={(event) => update('teamSize', event.target.value)} style={FIELD_STYLE}>
                    <option value="">Select team size</option>
                    {TEAM_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
              </div>
              <div>
                <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,.78)', fontSize: 13, fontWeight: 900 }}>Primary funder types</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                  {FUNDER_TYPES.map((type) => (
                    <OptionButton key={type.id} active={form.primaryFunderTypes.includes(type.id)} onClick={() => toggleArrayValue('primaryFunderTypes', type.id)}>
                      {type.label}
                    </OptionButton>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, border: '1px solid rgba(212,175,55,.32)', background: 'rgba(212,175,55,.1)', borderRadius: 12, padding: 14 }}>
              <p style={{ margin: 0, color: '#E8D28C', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>Personalization preview</p>
              <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.82)' }}>
                Workspace: {profile.workspaceMode}. Recommended CTA: {profile.pricingRecommendation}. {profile.nyMode ? 'NY mode will be active.' : 'Global mode will stay active.'}
              </p>
            </div>
          </section>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 28, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1 || saving}
            style={{
              padding: '12px 18px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,.18)',
              background: 'transparent',
              color: step === 1 ? 'rgba(255,255,255,.32)' : '#fff',
              fontWeight: 800,
              cursor: step === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Back
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((current) => current + 1)}
              disabled={!canContinue() || saving}
              style={{
                padding: '12px 22px',
                borderRadius: 10,
                border: 'none',
                background: canContinue() ? '#D4AF37' : 'rgba(212,175,55,.35)',
                color: '#0A0F1A',
                fontWeight: 900,
                cursor: canContinue() ? 'pointer' : 'not-allowed',
                marginLeft: 'auto',
              }}
            >
              Continue
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={enterWorkspace}
                disabled={!canContinue() || saving}
                style={{
                  padding: '12px 22px',
                  borderRadius: 10,
                  border: 'none',
                  background: canContinue() ? '#D4AF37' : 'rgba(212,175,55,.35)',
                  color: '#0A0F1A',
                  fontWeight: 900,
                  cursor: canContinue() ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Saving...' : 'Enter Workspace'}
              </button>
            </div>
          )}
        </div>

        {step < 5 ? (
          <LifetimeBadge />
        ) : (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ margin: '0 0 10px', color: '#E8D28C', fontSize: 13, fontWeight: 900 }}>
              Lifetime Access Available - $149 one-time (Limited to 200 users)
            </p>
            <button
              type="button"
              onClick={unlockLifetime}
              disabled={!canContinue() || saving || checkoutLoading}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid rgba(212,175,55,.5)',
                background: 'rgba(212,175,55,.12)',
                color: '#E8D28C',
                fontWeight: 900,
                cursor: canContinue() ? 'pointer' : 'not-allowed',
              }}
            >
              {checkoutLoading ? 'Opening checkout...' : 'Unlock Lifetime Access'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
