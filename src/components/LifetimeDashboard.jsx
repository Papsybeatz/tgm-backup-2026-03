import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';

export default function LifetimeDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();

  const downloadCertificate = () => {
    const name = user?.email || 'Founding Member';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Founding Member Certificate</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:40px;text-align:center;background:#fff"><div style="border:4px solid #D4AF37;padding:30px;border-radius:12px;display:inline-block;"><h1 style="margin:0;color:#b8860b">Founding Member Certificate</h1><p style="margin-top:10px">This certifies that</p><h2 style="margin:8px 0;color:#333">${name}</h2><p style="margin-top:10px">is a Lifetime Member of GrantsMaster. Thank you for your early support.</p><small style="display:block;margin-top:18px;color:#666">Issued: ${new Date().toLocaleDateString()}</small></div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'founding-member-certificate.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="content-wrapper">
      <div className="flex items-center gap-md mb-lg">
        <h1 className="heading-lg m-0">Lifetime Dashboard</h1>
        <span className="tier-badge" style={{ background: 'linear-gradient(90deg,#ffd700,#e6b800)', color: '#111' }}>
          ⭐ Lifetime Member
        </span>
      </div>

      <div className="card mb-lg">
        <div className="card-header">
          Welcome{user?.email ? `, ${user.email}` : ''}
        </div>
        <div className="card-body">
          <p className="body-text">
            You have lifetime access to all Pro features and future updates. Upgrade prompts are disabled for lifetime members.
          </p>
        </div>
      </div>

      <div className="card mb-lg">
        <div className="card-header">Lifetime Perks</div>
        <div className="card-body">
          <ul className="list-none p-0 flex flex-col gap-sm">
            <li className="body-text">✓ Priority support channel</li>
            <li className="body-text">✓ Early access to new agents</li>
            <li className="body-text">✓ Usage stats and export access</li>
            <li>
              <span className="body-text">✓ Founding Member certificate</span>
              <div className="mt-sm">
                <button className="btn btn-secondary" onClick={downloadCertificate}>
                  Download Certificate
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <button className="btn btn-ghost" onClick={() => navigate('/')}>
        Return Home
      </button>
    </div>
  );
}
