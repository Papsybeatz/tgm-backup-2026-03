import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px', fontFamily: 'inherit', color: '#1e293b' }}>
      <Link to="/" style={{ color: '#003A8C', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>← Back to GrantsMaster</Link>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0A0F1A', margin: '32px 0 8px' }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 40 }}>Last updated: May 2, 2026</p>

      {[
        {
          title: '1. Information We Collect',
          body: `We collect information you provide directly: name, email address, and payment information when you create an account or make a purchase. We also collect usage data such as drafts created, AI actions used, and session activity to improve the platform.`,
        },
        {
          title: '2. How We Use Your Information',
          body: `We use your information to provide and improve the GrantsMaster service, process payments, send transactional emails (account confirmations, billing receipts), and respond to support requests. We do not sell your personal data to third parties.`,
        },
        {
          title: '3. Data Storage',
          body: `Your data is stored securely on Supabase (PostgreSQL) hosted on AWS infrastructure in the US East region. Draft content is encrypted at rest. We retain your data for as long as your account is active or as needed to provide services.`,
        },
        {
          title: '4. Third-Party Services',
          body: `We use the following third-party services: LemonSqueezy for payment processing, SendGrid for transactional email, Groq for AI draft generation, and Vercel/Railway for hosting. Each service has its own privacy policy governing data they process.`,
        },
        {
          title: '5. Cookies',
          body: `We use localStorage (not cookies) to maintain your session. No tracking cookies or advertising pixels are used on this platform.`,
        },
        {
          title: '6. Your Rights',
          body: `You may request deletion of your account and all associated data at any time by contacting us at support@thegrantsmaster.com. We will process deletion requests within 30 days.`,
        },
        {
          title: '7. Contact',
          body: `For privacy-related questions, contact us at: support@thegrantsmaster.com`,
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#003A8C', marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#334155' }}>{body}</p>
        </div>
      ))}
    </div>
  );
}
