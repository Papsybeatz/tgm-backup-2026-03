import React, { useState } from 'react';
import AssistantChatButton from './AssistantChatButton';
import AssistantChatPanel from './AssistantChatPanel';

export default function SteveAssistantDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AssistantChatPanel open={open} onClose={() => setOpen(false)} />
      <AssistantChatButton open={open} onClick={() => setOpen((current) => !current)} />
    </>
  );
}
