import React from 'react';

export function MatchingPanel({ draftId }) {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Grant Matches</div>
      <div style={{ fontSize: 13, color: '#555' }}>No matches (mock)</div>
    </div>
  );
}

export default MatchingPanel;
