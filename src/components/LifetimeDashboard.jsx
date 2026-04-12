import React from 'react';
import { useUser } from './UserContext';

export default function LifetimeDashboard() {
  const { user } = useUser();

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Lifetime Dashboard</h1>
        <span style={{ background: 'linear-gradient(90deg,#ffd700,#e6b800)', padding: '6px 10px', borderRadius: 6, color: '#111', fontWeight: '600' }}>
          ⭐ Lifetime Member
        </span>
      </div>

      <section style={{ marginTop: 20 }}>
        <h2>Welcome{user && user.email ? `, ${user.email}` : ''}</h2>
        <p>You have lifetime access to all Pro features and future updates. Upgrade prompts are disabled for lifetime members.</p>

        <div style={{ marginTop: 20 }}>
          <h3>Lifetime Perks</h3>
          <ul>
            <li>Priority support channel</li>
            <li>Early access to new agents</li>
            <li>
              Founding Member certificate
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => {
                    const name = (user && user.email) ? user.email : 'Founding Member';
                    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Founding Member Certificate</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:40px;text-align:center;background:#fff"><div style=\"border:4px solid #D4AF37;padding:30px;border-radius:12px;display:inline-block;\"><h1 style=\"margin:0;color:#b8860b\">Founding Member Certificate</h1><p style=\"margin-top:10px\">This certifies that</p><h2 style=\"margin:8px 0;color:#333\">${name}</h2><p style=\"margin-top:10px\">is a Lifetime Member of GrantsMaster. Thank you for your early support.</p><small style=\"display:block;margin-top:18px;color:#666\">Issued: ${new Date().toLocaleDateString()}</small></div></body></html>`;
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'founding-member-certificate.html';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ padding: '8px 12px', borderRadius: 6, background: '#ffd700', border: 'none', cursor: 'pointer' }}
                >
                  Download Certificate
                </button>
              </div>
            </li>
            <li>Usage stats and export access</li>
          </ul>
        </div>

        <div style={{ marginTop: 20 }}>
          <button onClick={() => window.location.href = '/'} style={{ padding: '8px 14px', borderRadius: 6 }}>Return Home</button>
        </div>
      </section>
    </div>
  );
}
