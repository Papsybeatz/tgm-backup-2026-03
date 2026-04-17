// AgentDebugDashboard.jsx
// Real-time debug panel for The Grants Master agent system
import React, { useState, useEffect } from 'react';
import './AgentDebugDashboard.css';
import { trackEvent } from '../core/Analytics';

export default function AgentDebugDashboard({
  visible,
  onClose,
  agentState = {},
  routingDecision = {},
  memory = {},
  workflow = {},
  usage = {},
  isAdmin = false,
  user = { userId: 'admin', tier: 'admin' }
}) {
  const [expanded, setExpanded] = useState({});
  useEffect(() => {
    if (visible && isAdmin) {
      trackEvent('admin_dashboard_viewed', {}, user);
    }
  }, [visible, isAdmin]);
  if (!visible || !isAdmin) return null;

  const toggle = key => {
    setExpanded(e => {
      const next = { ...e, [key]: !e[key] };
      trackEvent('debug_dashboard_toggle', { section: key, expanded: !e[key] }, user);
      return next;
    });
  };

  return (
    <div className="debugPanel">
      <div className="debugHeader">
        <span>Agent Debug Dashboard</span>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="debugSection">
        <h4 onClick={() => toggle('agent')}>Active Agent</h4>
        {expanded.agent && (
          <div className="debugItem">
            <b>Name:</b> {agentState.name}<br />
            <b>Input:</b> <pre>{JSON.stringify(agentState.input, null, 2)}</pre>
            <b>Output:</b> <pre>{JSON.stringify(agentState.output, null, 2)}</pre>
          </div>
        )}
      </div>
      <div className="debugSection">
        <h4 onClick={() => toggle('routing')}>Routing Decision</h4>
        {expanded.routing && (
          <div className="debugItem">
            <pre>{JSON.stringify(routingDecision, null, 2)}</pre>
          </div>
        )}
      </div>
      <div className="debugSection">
        <h4 onClick={() => toggle('memory')}>Memory Snapshot</h4>
        {expanded.memory && (
          <div className="debugItem">
            <b>GrantMemory:</b> <pre>{JSON.stringify(memory.GrantMemory, null, 2)}</pre>
            <b>UserMemory:</b> <pre>{JSON.stringify(memory.UserMemory, null, 2)}</pre>
            <b>WorkflowMemory:</b> <pre>{JSON.stringify(memory.WorkflowMemory, null, 2)}</pre>
          </div>
        )}
      </div>
      <div className="debugSection">
        <h4 onClick={() => toggle('workflow')}>Workflow Progress</h4>
        {expanded.workflow && (
          <div className="debugItem">
            <b>Step:</b> {workflow.currentStep} of {workflow.totalSteps}<br />
            <b>Agent:</b> {workflow.nextAgent}<br />
            <b>Status:</b> {workflow.status || 'idle'}
          </div>
        )}
      </div>
      <div className="debugSection">
        <h4 onClick={() => toggle('usage')}>Usage Meter</h4>
        {expanded.usage && (
          <div className="debugItem">
            <b>Drafts used:</b> {usage.grantDrafts}<br />
            <b>Validator runs:</b> {usage.validatorRuns}<br />
            {usage.upgradePrompt && <div className="debugError">Upgrade for unlimited access</div>}
          </div>
        )}
      </div>
      {/* Admin controls */}
      {isAdmin && (
        <div className="debugSection">
          <button className="debugItem" onClick={() => window.dispatchEvent(new CustomEvent('forceReroute'))}>Force Reroute</button>
          <button className="debugItem" onClick={() => window.dispatchEvent(new CustomEvent('skipStep'))}>Skip Step</button>
        </div>
      )}
    </div>
  );
}
