import React, { useState } from "react";

const scoreColors = {
  gold: "#f2c94c",
  blue: "#2f80ed",
  gray: "#7f8fa6",
};

function getScoreColor(score) {
  if (score >= 80) return "gold";
  if (score >= 60) return "blue";
  return "gray";
}

function getInitials(name) {
  return name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase();
}

export default function MatchingGrantCard({ grant, onOpen, onSave, saved, expanded, onExpand }) {
  const scoreColor = getScoreColor(grant.matchScore);
  return (
    <div className="grant-card" style={{ position: "relative", marginBottom: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.12)", background: "#fff", padding: 24, transition: "box-shadow 0.15s" }}>
      {/* Match Score Badge */}
      <div style={{ position: "absolute", top: 16, left: 16, background: scoreColors[scoreColor], color: scoreColor === "gold" ? "#222" : "#fff", borderRadius: 8, padding: "0.25em 0.75em", fontWeight: 700, fontSize: "1.1em", boxShadow: "0 1px 4px rgba(0,0,0,0.10)", animation: "pulse 1.5s infinite ease-in-out" }}>
        {grant.matchScore}
      </div>
      {/* Deadline Badge */}
      <div style={{ position: "absolute", top: 16, right: 16, background: "#2f80ed", color: "#fff", borderRadius: 8, padding: "0.25em 0.75em", fontWeight: 600, fontSize: "0.95em" }}>
        {grant.deadline || "Rolling"}
      </div>
      {/* Funder Logo/Initials */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        {grant.funderLogo ? (
          <img src={grant.funderLogo} alt={grant.funder} style={{ width: 32, height: 32, borderRadius: "50%" }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e0e7ef", color: "#2f80ed", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1em" }}>
            {getInitials(grant.funder)}
          </div>
        )}
        <span style={{ fontWeight: 600, fontSize: "1.1em" }}>{grant.title}</span>
        <span className="text-muted" style={{ fontSize: "0.95em" }}>{grant.funder}</span>
      </div>
      {/* Funding Range, Sector, Tags */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>{grant.fundingRange}</span>
        {grant.sector && <span style={{ marginLeft: 8 }}>{grant.sector}</span>}
        {grant.tags && grant.tags.length > 0 && (
          <span style={{ marginLeft: 8 }}>
            {grant.tags.map(tag => (
              <span key={tag} style={{ background: "#f4f8ff", color: "#2f80ed", borderRadius: 6, padding: "2px 8px", marginRight: 4, fontSize: "0.9em" }}>{tag}</span>
            ))}
          </span>
        )}
      </div>
      {/* Expandable Why This Grant */}
      <button className="secondary" style={{ marginBottom: 8 }} onClick={onExpand}>
        {expanded ? "Hide Why this grant" : "Why this grant?"}
      </button>
      {expanded && (
        <div style={{ marginBottom: 8, background: "#f8f9fa", borderRadius: 8, padding: 12, animation: "slideDown 0.3s" }}>
          {grant.why && grant.why.map((line, idx) => (
            <div key={idx} style={{ color: line.strength === "strong" ? "#27ae60" : line.strength === "partial" ? "#f2c94c" : "#7f8fa6", fontWeight: 500, marginBottom: 4 }}>
              {line.text}
            </div>
          ))}
        </div>
      )}
      {/* Save/track button */}
      <button className="secondary" style={{ marginRight: 8 }} onClick={onSave}>
        {saved ? <span role="img" aria-label="saved">🔖</span> : <span role="img" aria-label="unsaved">📑</span>} Save Grant
      </button>
      {/* CTA */}
      <button className="primary" onClick={() => onOpen(grant.id)}>
        Open Grant
      </button>
    </div>
  );
}
