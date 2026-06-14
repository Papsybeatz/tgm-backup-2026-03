import React, { useEffect, useState } from 'react';

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

  useEffect(() => {
    const token = localStorage.getItem('token');
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
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#0A0F1A] text-white">
                <tr>
                  {[
                    'Email',
                    'Tier',
                    'Stripe Customer',
                    'Subscription',
                    'Status',
                    'Next Billing',
                    'Last Webhook Event',
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
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
