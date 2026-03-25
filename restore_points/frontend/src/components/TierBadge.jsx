import React from "react";

const tierColors = {
  Free: "#7f8fa6",
  Starter: "#2f80ed",
  Pro: "#f2c94c",
  "Agency Starter": "#2f80ed",
  "Agency Unlimited": "#ff9800",
};

export default function TierBadge({ tier }) {
  return (
    <span
      className="tier-badge"
      style={{
        background: tierColors[tier] || "#7f8fa6",
        color: tier === "Pro" ? "#222" : "#fff",
        borderRadius: 8,
        padding: "0.25em 0.75em",
        fontWeight: 600,
        fontSize: "0.95em",
        marginLeft: 8,
        display: "inline-block",
      }}
    >
      {tier}
    </span>
  );
}
