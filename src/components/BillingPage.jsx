import React from 'react';
import { Link } from 'react-router-dom';
import BillingPortalButton from './BillingPortalButton';

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB] px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Account</p>
          <h1 className="text-3xl font-bold text-[#0A0F1A]">Billing</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Manage your current plan, upgrade access, or open the billing portal.
          </p>
        </div>

        <BillingPortalButton />

        <div className="mt-6">
          <Link to="/dashboard" className="text-sm font-bold text-[#003A8C] no-underline hover:text-[#B8960C]">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
