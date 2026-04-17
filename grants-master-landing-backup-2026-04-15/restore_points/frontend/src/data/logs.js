// Mock logs for Admin Logs Viewer
export const gmLogs = [
  {
    timestamp: '2026-01-09T09:00:00Z',
    eventType: 'DRAFT_GENERATED',
    payload: { tier: 'Pro', userId: 'user123', draftId: 'draft001' }
  },
  {
    timestamp: '2026-01-09T09:05:00Z',
    eventType: 'TIER_ACTIVATED',
    payload: { tier: 'Starter', userId: 'user456' }
  },
  {
    timestamp: '2026-01-09T09:10:00Z',
    eventType: 'FILE_UPLOADED',
    payload: { tier: 'Agency', userId: 'user789', fileType: 'docx' }
  }
];

export const selfHealLogs = [
  {
    timestamp: '2026-01-09T09:15:00Z',
    componentName: 'ProDashboard',
    issueDescription: 'Button click handler undefined',
    patchSummary: 'Added handleDownload function and wired to Download button',
    filePath: 'src/components/ProDashboard.jsx'
  },
  {
    timestamp: '2026-01-09T09:20:00Z',
    componentName: 'LandingPage',
    issueDescription: 'Tab logic error',
    patchSummary: 'Auto-corrected tab index and reset tabs',
    filePath: 'src/components/LandingPage.jsx'
  }
];
