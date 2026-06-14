import React, { useCallback, useEffect, useState } from 'react';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

export default function AdminBillingPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [grantForm, setGrantForm] = useState({
    email: '',
    tier: 'pro',
    days: '30',
    reason: '',
  });
  const [grantStatus, setGrantStatus] = useState('');
  const [grantError, setGrantError] = useState('');

  const loadBilling = useCallback(() => {
    const token = localStorage.getItem('token');
    setStatus('loading');
    fetch('/api/admin/billing', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load billing status.');
        setRows(data.users || []);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load billing status.');
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  async function handleGrantTemporaryAccess(event) {
    event.preventDefault();
    setGrantStatus('');
    setGrantError('');

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/admin/billing/grant-temporary-access', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: grantForm.email,
          tier: grantForm.tier,
          days: grantForm.days,
          reason: grantForm.reason,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to grant temporary access.');

      setGrantStatus(`Temporary ${data.user.tier} access granted to ${data.user.email} until ${formatDate(data.user.currentPeriodEnd)}.`);
      setGrantForm((current) => ({ ...current, email: '', reason: '' }));
      loadBilling();
    } catch (err) {
      setGrantError(err.message || 'Failed to grant temporary access.');
    }
  }

  async function handleGrantNewestTemporaryAccess() {
    setGrantStatus('');
    setGrantError('');

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/admin/billing/grant-newest-temporary-access', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: 'starter',
          days: grantForm.days || '30',
          reason: 'Unknown external payment investigation',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to grant newest signup access.');

      setGrantStatus(`Temporary Starter access granted to newest non-founder signup: ${data.user.email} until ${formatDate(data.user.currentPeriodEnd)}.`);
      loadBilling();
    } catch (err) {
      setGrantError(err.message || 'Failed to grant newest signup access.');
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB] px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Admin</p>
          <h1 className="text-3xl font-bold text-[#003A8C]">Billing Status</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Stripe-backed billing diagnostics for investigating upgrades, webhook delivery, and ghost paid users.
          </p>
        </div>

        {status === 'loading' && <p className="text-sm text-gray-600">Loading billing status...</p>}
        {status === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {status === 'ready' && (
          <div className="space-y-6">
            <form onSubmit={handleGrantTemporaryAccess} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#003A8C]">Grant Temporary Access</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Use this for short grace access while a billing issue is being resolved. It expires automatically.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(220px,2fr)_minmax(150px,1fr)_minmax(110px,0.7fr)_minmax(180px,1.5fr)_auto] md:items-end">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">User Email</span>
                  <input
                    type="email"
                    value={grantForm.email}
                    onChange={(event) => setGrantForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#003A8C] focus:ring-2 focus:ring-[#003A8C]/15"
                    placeholder="subscriber@email.com"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Tier</span>
                  <select
                    value={grantForm.tier}
                    onChange={(event) => setGrantForm((current) => ({ ...current, tier: event.target.value }))}
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#003A8C] focus:ring-2 focus:ring-[#003A8C]/15"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="agency_starter">Agency Starter</option>
                    <option value="agency_unlimited">Agency Unlimited</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Days</span>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={grantForm.days}
                    onChange={(event) => setGrantForm((current) => ({ ...current, days: event.target.value }))}
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#003A8C] focus:ring-2 focus:ring-[#003A8C]/15"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Reason</span>
                  <input
                    type="text"
                    value={grantForm.reason}
                    onChange={(event) => setGrantForm((current) => ({ ...current, reason: event.target.value }))}
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#003A8C] focus:ring-2 focus:ring-[#003A8C]/15"
                    placeholder="Billing review"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-[#003A8C] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#002D6D]"
                >
                  Grant Access
                </button>
              </div>
              {grantStatus && <p className="mt-3 text-sm font-semibold text-green-700">{grantStatus}</p>}
              {grantError && <p className="mt-3 text-sm font-semibold text-red-700">{grantError}</p>}
              <div className="mt-5 border-t border-[#E2E8F0] pt-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Do not know the customer email yet?</h3>
                    <p className="mt-1 max-w-3xl text-sm text-gray-600">
                      Grant Starter access to the newest signup that is not your founder account. This only works if no other temporary manual grant is currently active.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGrantNewestTemporaryAccess}
                    className="rounded-lg border border-[#003A8C] px-4 py-2 text-sm font-bold text-[#003A8C] transition hover:bg-[#003A8C] hover:text-white"
                  >
                    Grant Newest Signup Starter
                  </button>
                </div>
              </div>
            </form>

            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-[#0A0F1A] text-white">
                  <tr>
                    {[
                      'Email',
                      'Tier',
                      'Created',
                      'Provider',
                      'Type',
                      'Stripe Customer',
                      'Subscription',
                      'Status',
                      'Next Billing / Access Ends',
                      'Last Billing Event',
                    ].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-4 py-3 font-bold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.userId} className="border-t border-[#E2E8F0]">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#003A8C]">{row.email}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.currentTier || 'free'}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(row.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.provider || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.subscriptionType || 'none'}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.stripeCustomerId || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.subscriptionId || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.subscriptionStatus || 'inactive'}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(row.nextBillingDate)}</td>
                      <td className="min-w-[280px] px-4 py-3 text-xs text-gray-600">
                        {row.lastWebhookEvent ? `${row.lastWebhookEvent} (${formatDate(row.lastWebhookAt)})` : '—'}
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan="10" className="px-4 py-8 text-center text-gray-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
