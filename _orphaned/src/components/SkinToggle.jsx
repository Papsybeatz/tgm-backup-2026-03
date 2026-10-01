import React from 'react';
import { useSkin } from '../hooks/useSkin';

export default function SkinToggle() {
  const { skin, toggleSkin } = useSkin();

  return (
    <button
      onClick={toggleSkin}
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
      style={{
        background: skin === 'futuristic' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        border: `1px solid ${skin === 'futuristic' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
        color: skin === 'futuristic' ? '#00f0ff' : '#6b7280'
      }}
    >
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: skin === 'futuristic' ? '#00f0ff' : '#9ca3af',
        boxShadow: skin === 'futuristic' ? '0 0 8px #00f0ff' : 'none'
      }} />
      {skin === 'default' ? 'AI Mode' : 'Classic'}
    </button>
  );
}