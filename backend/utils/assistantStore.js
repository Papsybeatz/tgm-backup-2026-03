const sessions = {};

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createSession(userId) {
  const session = {
    id: createId('assistant_session'),
    userId,
    messages: [],
    draftReference: null,
  };
  sessions[userId] = session;
  return session;
}

function getSession(userId) {
  return sessions[userId] || null;
}

function getOrCreateSession(userId) {
  return getSession(userId) || createSession(userId);
}

function addMessage(userId, message) {
  const session = getOrCreateSession(userId);
  session.messages.push(message);
  return session;
}

function updateIntent(userId, intent) {
  const session = getOrCreateSession(userId);
  session.lastIntent = intent;
  return session;
}

function updateDraftReference(userId, draftReference) {
  const session = getOrCreateSession(userId);
  session.draftReference = draftReference;
  return session;
}

module.exports = {
  createSession,
  getSession,
  getOrCreateSession,
  addMessage,
  updateIntent,
  updateDraftReference,
};
