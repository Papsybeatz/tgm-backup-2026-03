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
}) {
  const [activeSection, setActiveSection] = useState('Executive Summary');

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <Topbar
        title={title}
        setTitle={setTitle}
        saved={saved}
        wordCount={wordCount}
        readingTime={readingTime}
      />

      {/* Main 3-pane area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — sections */}
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />

        {/* Editor area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>

        {/* Right sidebar — AI assistant */}
        <AIAssistant onAction={onAIAction} loading={aiLoading} />
      </div>

      {/* Status bar */}
      <div className="h-9 border-t bg-white flex items-center justify-between px-6 text-xs text-gray-400 flex-shrink-0">
        <span>Words: {wordCount} · Reading time: {readingTime} min</span>
        <span className={saved ? 'text-green-600' : 'text-amber-500'}>
          {saved ? '✓ All changes saved' : '● Saving…'}
        </span>
      </div>
    </div>
  );
}
