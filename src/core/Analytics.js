// Analytics.js
// Analytics and conversion tracking for The Grants Master

const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '';
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN || '';

function getSessionId() {
  let sid = sessionStorage.getItem('gm_sessionId');
  if (!sid) {
    sid = Math.random().toString(36).substr(2, 12);
    sessionStorage.setItem('gm_sessionId', sid);
  }
  return sid;
}

export function trackEvent(name, payload = {}, user = {}) {
  const event = {
    name,
    payload,
    userId: user.userId || 'anon',
    tier: user.tier || 'unknown',
    sessionId: getSessionId(),
    timestamp: new Date().toISOString()
  };
  // Send to PostHog
  if (POSTHOG_KEY && window.posthog) {
    window.posthog.capture(name, event);
  }
  // Send to Plausible
  if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible(name, { props: event });
  }
  // Send to backend (optional)
  if (ANALYTICS_ENDPOINT) {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  }
  // Optionally log to console in dev
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line
    console.log('[Analytics]', name, event);
  }
}

// Core events (for reference)
export const CORE_EVENTS = [
  'page_view',
  'email_captured',
  'onboarding_started',
  'onboarding_completed',
  'agent_called',
  'workflow_started',
  'workflow_completed',
  'draft_created',
  'validator_run',
  'polisher_run',
  'upgrade_clicked',
  'checkout_started',
  'checkout_completed',
  'feature_blocked',
  'invite_code_entered',
  'beta_access_granted'
];

// Funnel tracking helpers
export function trackFunnel(stage, user) {
  trackEvent('funnel_stage', { stage }, user);
}

// Feature usage analytics helpers
export function trackAgentUsage(agentName, user) {
  trackEvent('agent_called', { agentName }, user);
}
export function trackWorkflowUsage(workflowName, user) {
  trackEvent('workflow_started', { workflowName }, user);
}

// Admin analytics dashboard data (stub)
export function getAdminAnalytics() {
  // In production, fetch from backend analytics API
  return {
    totalUsers: 0,
    activeUsers: { daily: 0, weekly: 0, monthly: 0 },
    conversionRate: 0,
    mostUsedAgents: [],
    mostAbandonedWorkflows: [],
    betaInviteAcceptance: 0,
    tierDistribution: {}
  };
}
