import React from "react";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const statusColors: Record<string, string> = {
  draft: "#fbbf24",
  in_progress: "#60a5fa",
  polished: "#34d399",
  archived: "#a1a1aa"
};

export default function GrantListItem({ grant, active }: { grant: any; active?: boolean }) {
  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        background: active ? "#e0e7ef" : undefined,
        borderLeft: active ? "4px solid #2563eb" : "4px solid transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        borderBottom: "1px solid #f1f5f9"
      }}
      title={grant.lastEditedAt ? `Last edited: ${new Date(grant.lastEditedAt).toLocaleString()}` : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 500, flex: 1, color: active ? "#1e293b" : "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {grant.title}
        </span>
        <span
          style={{
            background: statusColors[grant.status] || "#e5e7eb",
            color: "#fff",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            padding: "2px 10px",
            marginLeft: 6
          }}
        >
          {grant.status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </span>
      </div>
      <span style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
        {grant.lastEditedAt ? formatDate(grant.lastEditedAt) : ""}
      </span>
    </div>
  );
}
