import React, { useState } from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import AIAssistant from './AIAssistant';

export default function WorkspaceLayout({
  children,
  title,
  setTitle,
  saved,
  wordCount = 0,
  readingTime = 0,
  onAIAction,
  aiLoading,
  onUploadImported,
}) {
  const [activeSection, setActiveSection] = useState('Executive Summary');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-[#EEF2F7] via-[#F5F7FB] to-[#EDF2F8]">
      {/* Top bar */}
      <Topbar
        title={title}
        setTitle={setTitle}
        saved={saved}
        wordCount={wordCount}
        readingTime={readingTime}
        onUploadImported={onUploadImported}
      />

      {/* Main 3-pane area */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-5 overflow-hidden px-4 py-5 md:px-6">
        {/* Left sidebar — sections */}
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />

        {/* Editor area */}
        <main className="flex-1 overflow-y-auto rounded-2xl border border-[#D4AF37]/50 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          {children}
        </main>

        {/* Right sidebar — AI assistant */}
        <AIAssistant onAction={onAIAction} loading={aiLoading} />
      </div>

      {/* Status bar */}
      <div className="h-10 border-t border-slate-200 bg-white/90 px-6 text-xs font-medium text-slate-500 flex items-center justify-between flex-shrink-0">
        <span>Words: {wordCount} · Reading time: {readingTime} min</span>
        <span className={saved ? 'text-emerald-600' : 'text-amber-600'}>
          {saved ? '✓ All changes saved' : '● Saving…'}
        </span>
      </div>
    </div>
  );
}
