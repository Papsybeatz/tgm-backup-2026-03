import React, { useEffect, useState } from 'react';

/**
 * Clock — a live local-time card for the dashboard header.
 *
 * Fills the space the old "Plan / Starter" box occupied. Client-only: this is a
 * client-rendered SPA, so there is no server render to mismatch.
 */
export default function Clock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const date = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="shrink-0 rounded-xl border border-[#E2E8F0] bg-gradient-to-b from-white to-[#F8FAFC] px-5 py-4 text-right shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Local time</p>
      <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-[#003A8C]">{time}</p>
      <p className="mt-1 text-xs font-semibold text-gray-600">{date}</p>
    </div>
  );
}
