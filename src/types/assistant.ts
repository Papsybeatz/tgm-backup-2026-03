export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
};

export type AssistantSession = {
  id: string;
  userId: string;
  messages: AssistantMessage[];
  lastIntent?: string;
};
