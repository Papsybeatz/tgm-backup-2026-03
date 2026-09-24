import React from 'react';
import { Link } from 'react-router-dom';

const LINKEDIN = 'https://www.linkedin.com/in/thomas-clottey';
const FACEBOOK = 'https://www.facebook.com/TheGrantsMaster';
const PHONE = '(540) 566-9760';
const PHONE_HREF = 'tel:+15405669760';
const EMAIL = 'support@thegrantsmaster.com';
const ENTITY = 'Gee Oh Dee (Tech) LLC';
const ADDRESS = '4210 Electric Road #1038, Roanoke, VA 24018, United States';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px', color: '#1e293b' }}>
      <Link to="/" style={{ color: '#003A8C', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
        ← Back to GrantsMaster
      </Link>

      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0A0F1A', margin: '32px 0 12px' }}>
        The person and company behind The Grants Master
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.7, color: '#334155' }}>
        We believe in building in public, staying transparent, and being reachable. No anonymous AI wrapper. No mystery company.
      </p>

      {/* Founder */}
      <div style={{
        marginTop: 32,
        display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start',
        border: '1px solid #E2E8F0', background: '#F8F9FC',
        borderRadius: 16, padding: '24px 26px',
      }}>
        <div style={{
          width: 128, height: 128, borderRadius: '50%', overflow: 'hidden',
          border: '4px solid #D4AF37', background: '#fff', flexShrink: 0,
        }}>
          <img
            src="/founder-headshot.jpg"
            alt="Thomas Clottey, founder of The Grants Master"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A0F1A' }}>Thomas Clottey</p>
          <p style={{ margin: '2px 0 0', fontSize: 14, color: '#475569' }}>Full Stack / AI Software Developer</p>
          <p style={{ margin: '2px 0 0', fontSize: 14, color: '#475569' }}>Founder, The Grants Master</p>

          <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.8, color: '#334155' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#0A0F1A' }}>{ENTITY}</p>
            <p style={{ margin: 0 }}>{ADDRESS}</p>
            <p style={{ margin: '10px 0 0' }}>
              <a href={`mailto:${EMAIL}`} style={{ color: '#003A8C', fontWeight: 600 }}>{EMAIL}</a>
              {' · '}
              <a href={PHONE_HREF} style={{ color: '#003A8C', fontWeight: 600 }}>{PHONE}</a>
              {' · '}
              <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" style={{ color: '#003A8C', fontWeight: 600 }}>LinkedIn</a>
              {' · '}
              <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" style={{ color: '#003A8C', fontWeight: 600 }}>Facebook</a>
            </p>
          </div>
        </div>
      </div>

      {/* Founder note */}
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0A0F1A', margin: '40px 0 12px' }}>Why we built TGM</h2>
      <p style={{ fontSize: 15, lineHeight: 1.8, color: '#334155' }}>
        As part of my passion to build AI-powered web applications and software that solve real pain points, I built The Grants Master because nonprofits deserve more than generic AI. After years of watching teams spend 40+ hours on a single narrative — and still lose funding due to avoidable alignment issues — I knew there had to be a better way.
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.8, color: '#334155' }}>
        TGM gives every organization the grant-writing capacity of a full-time staff member, without the cost. With Steve drafting funder-ready narratives and Checkmate scoring proposals before submission, you finally get clarity, speed, and confidence in one place.
      </p>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0F1A', marginTop: 20 }}>— Thomas Clottey, Founder</p>

      {/* Mission */}
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0A0F1A', margin: '40px 0 12px' }}>Our mission</h2>
      <p style={{ fontSize: 15, lineHeight: 1.8, color: '#334155' }}>
        We built TGM to give every nonprofit the grant-writing capacity of a full-time staff member — without the cost. Clearer proposals. Faster drafting. Better alignment. Less stress.
      </p>

      {/* Contact */}
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0A0F1A', margin: '40px 0 12px' }}>Get in touch</h2>
      <p style={{ fontSize: 15, lineHeight: 1.8, color: '#334155', marginTop: 0 }}>
        Questions about pricing, features, or partnerships? We respond within 24 hours, Monday–Friday, 9am–6pm EST.
      </p>
      <p style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
        <a href={`mailto:${EMAIL}`} style={{
          padding: '11px 24px', borderRadius: 9, background: '#D4AF37',
          color: '#0A0F1A', fontWeight: 700, fontSize: 14, textDecoration: 'none',
        }}>
          Email support
        </a>
        <Link to="/trust" style={{
          padding: '11px 24px', borderRadius: 9, border: '1px solid #003A8C',
          color: '#003A8C', fontWeight: 700, fontSize: 14, textDecoration: 'none',
        }}>
          Read our Trust &amp; Transparency commitment →
        </Link>
      </p>
    </div>
  );
}
