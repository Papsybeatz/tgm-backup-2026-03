import React from 'react';
import { useUser } from './UserContext';
export default function ContextDebug() {
  const ctx = useUser();
  return (
    <div style={{ padding: 32 }}>
      <h2>Context Debug</h2>
      <pre style={{ background: '#f8f9fa', color: '#333', padding: '1rem', borderRadius: 4 }}>
        {JSON.stringify(ctx, null, 2)}
      </pre>
    </div>
  );
}