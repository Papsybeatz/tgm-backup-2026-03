import React from 'react';

type AssistantChatButtonProps = {
  open: boolean;
  onClick: () => void;
};

export default function AssistantChatButton({ open, onClick }: AssistantChatButtonProps) {
  return (
    <button
      type="button"
      aria-label={open ? 'Close TGM Assistant' : 'Open TGM Assistant'}
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#0A0F1A] text-white shadow-2xl transition hover:-translate-y-0.5 hover:border-[#D4AF37] hover:bg-[#003A8C] focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/25 ${
        open ? 'pointer-events-none translate-y-2 opacity-0' : 'opacity-100'
      }`}
    >
      <span className="flex flex-col items-center leading-none">
        <span className="text-lg">?</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#E8D28C]">Ask</span>
      </span>
    </button>
  );
}
