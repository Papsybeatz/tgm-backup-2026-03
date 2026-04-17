import React, { useState } from "react";
import MatchingGrantCard from "../../components/MatchingGrantCard.jsx";

const mockGrants = [
  {
    id: 1,
    matchScore: 92,
    title: "Hope Rising Fund",
    funder: "Hope Rising Foundation",
    deadline: "Due in 12 days",
    fundingRange: "$50k–$200k",
    sector: "Youth",
    tags: ["Education", "Community"],
    why: [
      { text: "Sector match: Youth", strength: "strong" },
      { text: "Funding range compatible", strength: "partial" },
      { text: "Tag overlap: Education", strength: "strong" },
      { text: "Mission alignment", strength: "strong" },
      { text: "Geography alignment", strength: "partial" },
      { text: "Readiness alignment", strength: "weak" },
    ],
  },
  {
    id: 2,
    matchScore: 68,
    title: "Ford Foundation Grant",
    funder: "Ford Foundation",
    deadline: "Due March 15",
    fundingRange: "$100k–$500k",
    sector: "Arts",
    tags: ["Culture", "Equity"],
    why: [
      { text: "Sector match: Arts", strength: "strong" },
      { text: "Funding range compatible", strength: "strong" },
      { text: "Tag overlap: Equity", strength: "partial" },
      { text: "Mission alignment", strength: "partial" },
      { text: "Geography alignment", strength: "weak" },
      { text: "Readiness alignment", strength: "strong" },
    ],
  },
];

export default function Opportunities() {
  const [expandedId, setExpandedId] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  // Filters (mock)
  const [sector, setSector] = useState("");
  const [deadline, setDeadline] = useState("");
  const [funding, setFunding] = useState("");

  const grants = mockGrants.filter(g =>
    (!sector || g.sector === sector) &&
    (!deadline || g.deadline.includes(deadline)) &&
    (!funding || g.fundingRange.includes(funding))
  );

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Matching Opportunities</h2>
      {/* Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <select value={sector} onChange={e => setSector(e.target.value)}>
          <option value="">All Sectors</option>
          <option value="Youth">Youth</option>
          <option value="Arts">Arts</option>
        </select>
        <select value={deadline} onChange={e => setDeadline(e.target.value)}>
          <option value="">All Deadlines</option>
          <option value="12 days">Due in 12 days</option>
          <option value="March 15">Due March 15</option>
        </select>
        <select value={funding} onChange={e => setFunding(e.target.value)}>
          <option value="">All Funding</option>
          <option value="$50k">$50k–$200k</option>
          <option value="$100k">$100k–$500k</option>
        </select>
      </div>
      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Left: grant list */}
        <div>
          {grants.length === 0 ? (
            <div className="text-muted" style={{ textAlign: "center", padding: "2rem 0" }}>
              No matches yet — complete onboarding or adjust your goals to get personalized recommendations.
            </div>
          ) : (
            grants.map(grant => (
              <MatchingGrantCard
                key={grant.id}
                grant={grant}
                onOpen={id => setExpandedId(id)}
                onSave={() => setSavedIds(ids => ids.includes(grant.id) ? ids.filter(i => i !== grant.id) : [...ids, grant.id])}
                saved={savedIds.includes(grant.id)}
                expanded={expandedId === grant.id}
                onExpand={() => setExpandedId(expandedId === grant.id ? null : grant.id)}
              />
            ))
          )}
        </div>
        {/* Right: grant details panel */}
        <div>
          {expandedId ? (
            <div className="card" style={{ minHeight: 320 }}>
              <h3>Grant Details</h3>
              {/* TODO: Render full grant details here */}
              <div className="text-muted">Full details for grant #{expandedId}.</div>
            </div>
          ) : (
            <div className="text-muted" style={{ textAlign: "center", padding: "2rem 0" }}>
              Select a grant to see details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
