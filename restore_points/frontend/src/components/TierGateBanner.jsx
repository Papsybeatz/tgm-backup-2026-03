import React from "react";
import TierBadge from "./TierBadge.jsx";

export default function TierGateBanner({ tier, feature, explanation, onUpgrade, tooltip }) {
  return (
    <div className="tier-gate-banner card" style={{ display: "flex", alignItems: "center", gap: 16, margin: "1.5rem 0", background: "rgba(242,201,76,0.08)" }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600, fontSize: "1.1em" }}>
          You need <TierBadge tier={tier} /> to access {feature}.
        </span>
        <div className="text-muted" style={{ fontSize: "0.95em", marginTop: 4 }}>{explanation}</div>
      </div>
      <button className="primary" onClick={onUpgrade} style={{ display: "flex", alignItems: "center", gap: 6 }} title={tooltip || `Upgrade to ${tier}` }>
        Upgrade to {tier}
      </button>
    </div>
  );
}
