import type { AssistantMessage, AssistantSession } from '../types/assistant';

const sessions: Record<string, AssistantSession> = {};

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSession(userId: string): AssistantSession {
  const session: AssistantSession = {
    id: createId('assistant_session'),
    userId,
    messages: [],
  };
  sessions[userId] = session;
  return session;
}

export function getSession(userId: string): AssistantSession | null {
  return sessions[userId] || null;
}

export function addMessage(userId: string, message: AssistantMessage): void {
  const session = sessions[userId] || createSession(userId);
  session.messages.push(message);
}

export function updateIntent(userId: string, intent: string): void {
  const session = sessions[userId] || createSession(userId);
  session.lastIntent = intent;
}
