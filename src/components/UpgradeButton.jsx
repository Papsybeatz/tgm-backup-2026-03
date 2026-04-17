import React from 'react';
import { useUser } from './UserContext';
import { useNavigate } from 'react-router-dom';

export default function UpgradeButton({ tierKey, href, onClick, children }) {
  const { user } = useUser();
  const navigate = useNavigate();

  if (user && user.tier === 'lifetime') {
    return (
      <div style={{ padding: '10px', borderRadius: 6, background: 'linear-gradient(90deg,#fff9e6,#fff4cc)', color: '#6b4700', textAlign: 'center', fontWeight: 600 }}>
        You're a Lifetime Member — enjoy unlimited access.
      </div>
    );
  }

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
    if (href) {
      if (href.startsWith('http')) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else if (href === '#') {
        alert('Checkout coming soon! Use the Free tier for now.');
      } else {
        navigate(href);
      }
    }
  };

  return (
    <button 
      onClick={handleClick} 
      style={{ 
        padding: '10px 14px', 
        borderRadius: 8, 
        background: '#004aad', 
        color: '#fff', 
        border: 'none', 
        cursor: 'pointer',
        width: '100%',
        fontWeight: 600
      }}
    >
      {children}
    </button>
  );
}