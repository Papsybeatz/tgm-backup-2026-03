import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../components/UserContext';
import TeamSettingsPanel from '../components/TeamSettingsPanel';
import { TIERS } from '../config/tiers';

/**
 * Team settings — seats and invites.
 *
 * TeamSettingsPanel previously had no reachable home: its only parent was
 * AgencyDashboard, which is mounted on no route (and is a stale mockup built
 * from `alert('… coming soon!')` buttons). The panel was therefore dead code —
 * the invite API existed, but nothing a user could click ever called it. This
 * page gives it a real route.
 */
export default function TeamPage() {
  const { user } = useUser() ?? {};
  const seatCap = user ? TIERS[user.tier]?.limits?.teamSeats ?? 0 : 0;
  const hasSeats = seatCap > 0;

  return (
    <div className="min-h-screen bg-[#F7F9FB] px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Account</p>
          <h1 className="text-3xl font-bold text-[#0A0F1A]">Team</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Invite teammates and manage the seats included in your plan.
          </p>
        </div>

        {hasSeats ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
            <TeamSettingsPanel onSeatUpgrade={() => { window.location.href = '/plans'; }} />
          </div>
        ) : (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
            <p className="text-sm leading-6 text-gray-600">
              Team seats are included with the Pro and Agency plans. Pro includes 3 seats,
              Agency 10, and Agency+ unlimited.
            </p>
            <Link to="/plans" className="mt-4 inline-block text-sm font-bold text-[#003A8C] no-underline hover:text-[#B8960C]">
              Compare plans →
            </Link>
          </div>
        )}

        <div className="mt-6">
          <Link to="/dashboard" className="text-sm font-bold text-[#003A8C] no-underline hover:text-[#B8960C]">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
