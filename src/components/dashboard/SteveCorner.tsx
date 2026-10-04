import React, { useEffect, useState } from 'react';

type CornerItem = {
  kind: 'Grant tip' | 'Grant humor' | 'Quote';
  text: string;
  source?: string;
};

/**
 * SteveCorner — the rotating strip that fills the space under the intake form.
 *
 * Cycles through grant-writing tips, grant humor and quotes. Deliberately local
 * and static: no news feed is wired up, so it does not pretend to be live
 * headlines. Replace ITEMS with a feed (or an API response) when one exists.
 */
const ITEMS: CornerItem[] = [
  {
    kind: 'Grant tip',
    text: "Read the funder's last three awards before you write a word. Their own language is the rubric.",
  },
  {
    kind: 'Grant tip',
    text: 'Lead every section with the outcome, not the activity. Funders fund results, not effort.',
  },
  {
    kind: 'Grant tip',
    text: 'Every budget line should trace to a stated outcome. A budget that ignores the narrative reads as padding.',
  },
  {
    kind: 'Grant tip',
    text: 'Submit before the deadline, not the postmark date. Portals close on the clock, not the calendar.',
  },
  {
    kind: 'Grant tip',
    text: 'Give the evaluation plan measurable indicators. "We will assess" loses points; "we will track X by Y" wins them.',
  },
  {
    kind: 'Grant humor',
    text: "A grant writer's idea of a thriller: the submission portal at 11:58 pm.",
  },
  {
    kind: 'Grant humor',
    text: 'Budget justification: the art of explaining why the coffee is programmatic.',
  },
  {
    kind: 'Grant humor',
    text: 'Every proposal has three drafts — the one you wrote, the one the reviewer wanted, and the one due tomorrow.',
  },
  {
    kind: 'Grant humor',
    text: 'Nonprofit logic: we need the money to write the grant that gets us the money.',
  },
  {
    kind: 'Quote',
    text: 'The secret of getting ahead is getting started.',
    source: 'Mark Twain',
  },
  {
    kind: 'Quote',
    text: 'Quality is not an act, it is a habit.',
    source: 'Aristotle',
  },
  {
    kind: 'Quote',
    text: 'Success is the sum of small efforts repeated day in and day out.',
    source: 'Robert Collier',
  },
  {
    kind: 'Quote',
    text: 'If you want to go far, go together.',
    source: 'African proverb',
  },
];

const TONE: Record<CornerItem['kind'], string> = {
  'Grant tip': 'border-[#003A8C]/20 bg-[#EFF6FF] text-[#003A8C]',
  'Grant humor': 'border-[#F59E0B]/30 bg-[#FEF9C3] text-[#92400E]',
  Quote: 'border-[#7C3AED]/20 bg-[#F5F3FF] text-[#5B21B6]',
};

export default function SteveCorner() {
  const [index, setIndex] = useState(0);
  const total = ITEMS.length;

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % total), 9000);
    return () => window.clearInterval(id);
  }, [total]);

  const item = ITEMS[index];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#B8960C]">
          Steve&apos;s Corner
        </span>
        <div className="flex items-center gap-1.5">
          {ITEMS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show item ${i + 1} of ${total}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 w-1.5 rounded-full transition ${
                i === index ? 'bg-[#003A8C]' : 'bg-[#CBD5E1] hover:bg-[#94A3B8]'
              }`}
            />
          ))}
        </div>
      </header>
      <div className="flex-1 px-4 py-3.5" aria-live="polite">
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TONE[item.kind]}`}
        >
          {item.kind}
        </span>
        <p className="mt-2.5 text-[13px] leading-6 text-[#0A0F1A]">{item.text}</p>
        {item.source && (
          <p className="mt-1 text-[11px] font-semibold text-[#64748B]">— {item.source}</p>
        )}
      </div>
    </div>
  );
}
