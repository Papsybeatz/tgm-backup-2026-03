import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSkin } from '../hooks/useSkin';

function SkinToggleInternal() {
  const { skin, toggleSkin } = useSkin();
  return (
    <button
      onClick={toggleSkin}
      className={`px-3 py-1.5 rounded-md text-sm transition ${
        skin === 'futuristic'
          ? 'border border-[rgba(255,255,255,0.2)] text-gray-400 hover:text-white'
          : 'border border-gray-300 text-gray-600 hover:text-gray-900'
      }`}
    >
      {skin === 'default' ? 'AI Mode' : 'Classic'}
    </button>
  );
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const { skin } = useSkin();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const getDashboardRoute = () => {
    const tier = user?.tier || 'free';
    if (tier === 'free') return '/dashboard/free';
    if (tier === 'starter') return '/dashboard/starter';
    if (tier === 'pro') return '/dashboard/pro';
    if (tier === 'lifetime') return '/dashboard/lifetime';
    if (tier === 'agency_starter') return '/dashboard/agency-starter';
    if (tier === 'agency_unlimited') return '/dashboard/agency-unlimited';
    return '/dashboard/free';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition ${
          skin === 'futuristic'
            ? 'border border-[rgba(255,255,255,0.2)] text-gray-300 hover:bg-[rgba(255,255,255,0.05)]'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
          skin === 'futuristic' 
            ? 'bg-[rgba(0,240,255,0.1)]' 
            : 'bg-gradient-to-br from-[#D4AF37] to-[#E8D28C]'
        }`}>
          <span className={`text-xs font-bold ${
            skin === 'futuristic' ? 'text-[#00f0ff]' : 'text-[#0A0F1A]'
          }`}>GM</span>
        </div>
        <span>{user?.name || user?.email || 'Account'}</span>
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1 min-w-40 rounded-lg shadow-lg overflow-hidden z-50 ${
          skin === 'futuristic'
            ? 'bg-[#0a0a0f] border border-[rgba(255,255,255,0.1)]'
            : 'bg-white border border-gray-200'
        }`}>
          <Link
            to={getDashboardRoute()}
            onClick={() => setOpen(false)}
            className={`block px-4 py-2.5 text-sm ${
              skin === 'futuristic' ? 'text-gray-300 hover:bg-[rgba(255,255,255,0.05)]' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/workspace/premium-draft"
            onClick={() => setOpen(false)}
            className={`block px-4 py-2.5 text-sm ${
              skin === 'futuristic' ? 'text-gray-300 hover:bg-[rgba(255,255,255,0.05)]' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Drafts
          </Link>
          <button
            onClick={logout}
            className={`block w-full text-left px-4 py-2.5 text-sm ${
              skin === 'futuristic' ? 'text-gray-300 hover:bg-[rgba(255,255,255,0.05)]' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

// Avoid calling hooks at module scope. `useSkin` is used inside components only.

export default function AppHeader({ user, loading }) {
  const { skin: skinMode } = useSkin();
  const isDark = skinMode === 'futuristic';

  const getDashboardRoute = () => {
    const tier = user?.tier || 'free';
    if (tier === 'free') return '/dashboard/free';
    if (tier === 'starter') return '/dashboard/starter';
    if (tier === 'pro') return '/dashboard/pro';
    if (tier === 'lifetime') return '/dashboard/lifetime';
    if (tier === 'agency_starter') return '/dashboard/agency-starter';
    if (tier === 'agency_unlimited') return '/dashboard/agency-unlimited';
    return '/dashboard/free';
  };

  return (
    <header className={`sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b ${
      isDark 
        ? 'bg-[#0a0a0f]/90 border-[rgba(255,255,255,0.1)]' 
        : 'bg-white/90 border-gray-200'
    } backdrop-blur-md`}>
      {/* Logo + Brand */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-md ${
            isDark ? 'bg-[rgba(0,240,255,0.1)]' : 'bg-gradient-to-br from-[#D4AF37] to-[#E8D28C]'
          }`}>
            <span className={`text-sm font-bold ${isDark ? 'text-[#00f0ff]' : 'text-[#0A0F1A]'}`}>GM</span>
          </div>
          <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#0A0F1A]'}`}>
            GrantsMaster
          </span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm">
        {user && !loading ? (
          <>
            <Link 
              to={getDashboardRoute()} 
              className={`font-medium ${isDark ? 'text-white' : 'text-[#0A0F1A]'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/workspace/premium-draft" 
              className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-[#0A0F1A]'}
            >
              Drafts
            </Link>
          </>
        ) : (
          <>
            <Link to="/" className={isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-[#0A0F1A]'}>
              Home
            </Link>
            <Link to="/pricing" className={isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-[#0A0F1A]'}>
              Pricing
            </Link>
            <Link to="/contact" className={isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-[#0A0F1A]'}>
              Contact
            </Link>
          </>
        )}
      </nav>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        <SkinToggleInternal />
        
        {loading ? (
          <span className="text-sm opacity-60">Loading...</span>
        ) : user ? (
          <UserMenu user={user} />
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                isDark
                  ? 'border border-[rgba(255,255,255,0.2)] text-gray-300 hover:text-white'
                  : 'border border-[#003A8C] text-[#003A8C] hover:bg-[#003A8C] hover:text-white'
              }`}
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-md text-sm font-bold bg-[#D4AF37] text-[#0A0F1A] shadow-md hover:shadow-lg transition"
            >
              Get Started Free
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}