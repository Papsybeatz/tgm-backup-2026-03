import React from "react";
import TierBadge from "./TierBadge.jsx";

export default function SubscriptionSummaryCard({ plan, renewalDate, paymentMethod, onManage, benefits }) {
  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        Your Plan: <TierBadge tier={plan} />
      </h3>
      <p style={{ marginBottom: 8 }}>Renews on {renewalDate}</p>
      <div style={{ marginBottom: 8 }}>
        <span className="text-muted">Payment Method:</span> <span style={{ fontWeight: 600 }}>{paymentMethod}</span>
      </div>
      <button className="secondary" onClick={onManage} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span role="img" aria-label="lock">🔒</span> Manage Subscription
      </button>
      <div className="text-muted" style={{ fontSize: "0.95em", marginBottom: 8 }}>Manage payment method, invoices, and subscription</div>
      <div>
        <span className="text-muted">Includes:</span>
        <ul style={{ margin: "8px 0 0 0", padding: 0, listStyle: "none" }}>
          {benefits.map(b => (
            <li key={b} style={{ fontWeight: 500, marginBottom: 4 }}>• {b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
