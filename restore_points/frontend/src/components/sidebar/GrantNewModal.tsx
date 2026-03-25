import React, { useRef, useEffect, useState } from "react";

export default function GrantNewModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (title: string) => void }) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setError("");
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    onCreate(title.trim());
  }

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form
        onSubmit={handleSubmit}
        style={{ background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px #0002", padding: 32, minWidth: 340, display: "flex", flexDirection: "column", gap: 18 }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>New Grant</h2>
        <input
          ref={inputRef}
          type="text"
          placeholder="Grant title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ padding: 10, fontSize: 16, borderRadius: 6, border: "1px solid #e5e7eb", outline: error ? "1.5px solid #ef4444" : undefined }}
          disabled={submitting}
          onKeyDown={e => { if (e.key === "Escape") onClose(); }}
        />
        {error && <div style={{ color: "#ef4444", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, background: "#f1f5f9", border: "none", borderRadius: 6, padding: 10, fontWeight: 500, cursor: "pointer" }} disabled={submitting}>Cancel</button>
          <button type="submit" style={{ flex: 1, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: 10, fontWeight: 600, cursor: "pointer" }} disabled={submitting}>Create</button>
        </div>
      </form>
    </div>
  );
}
