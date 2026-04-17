import React from 'react';

export function WorkspaceLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg, #f8fafc)' }}>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default WorkspaceLayout;
