export function logEvent(eventType, payload = {}) {
  console.log('[GM-LOG]', eventType, payload);
  // Later: send to backend or external logging service
}
