// RequestAccessPage.jsx
//
// The public entry point for the invite-request waitlist.
//
// This was a stub — a heading and a paragraph, not routed anywhere — while the
// actual form (InviteRequestForm) was only reachable through UpgradeModal,
// which nothing imported. So the waitlist had no way in: the endpoint could be
// fixed and the requests would still never arrive. This page is the missing
// link, and it renders the same form the modal used.
import React from 'react';
import InviteRequestForm from './InviteRequestForm';

function RequestAccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-[#0A0F1A]">Request access</h1>
      <p className="mb-6 text-sm text-slate-600">
        Pro and Agency access is invite-only while we onboard. Tell us where to
        reach you and we&apos;ll be in touch.
      </p>
      <InviteRequestForm tier="pro" />
    </div>
  );
}

export default RequestAccessPage;
