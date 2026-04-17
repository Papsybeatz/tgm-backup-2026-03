import { useEffect, useState } from "react";

export default function DashboardLayout() {
  const [client, setClient] = useState(false);

  useEffect(() => {
    setClient(true);
  }, []);

  // FID health certificate UI feedback
  const [fidHealth, setFidHealth] = useState(null);

  useEffect(() => {
    // Poll for FID health certificate if available globally
    const interval = setInterval(() => {
      if (window.__FID_HEALTH_CERTIFICATE) {
        setFidHealth(window.__FID_HEALTH_CERTIFICATE);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Unified Frontend Guardian health feedback
  const [guardianHealth, setGuardianHealth] = useState(null);

  useEffect(() => {
    // Poll for unified guardian health certificate if available globally
    const interval = setInterval(() => {
      if (window.__FRONTEND_GUARDIAN_HEALTH) {
        setGuardianHealth(window.__FRONTEND_GUARDIAN_HEALTH);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Backend Health Certificate feedback
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    // Poll backend /health endpoint for health certificate
    async function fetchHealth() {
      try {
        const res = await fetch("http://127.0.0.1:4000/health");
        if (res.ok) {
          const data = await res.json();
          setBackendHealth(data);
        }
      } catch {}
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <AgencyLayout>
      <div className="flex h-screen" style={{ background: client ? 'rgba(47,128,237,0.03)' : undefined }}>
        {/* FID Health Certificate Banner */}
        {fidHealth && (
          <div style={{
            background: fidHealth.status === "healthy" ? '#d1fae5' : fidHealth.status === "repaired" ? '#fef3c7' : '#fee2e2',
            color: fidHealth.status === "healthy" ? '#065f46' : fidHealth.status === "repaired" ? '#92400e' : '#b91c1c',
            padding: '12px 24px',
            margin: '12px',
            borderRadius: 8,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            {fidHealth.status === "healthy" && (
              <span>🟢 Frontend Environment Integrity: PASSED</span>
            )}
            {fidHealth.status === "repaired" && (
              <span>🟡 Repairs applied: {fidHealth.repairs.join(", ")}. Issues: {fidHealth.issues.join(", ")}</span>
            )}
            {fidHealth.status === "failed" && (
              <span>🔴 Errors: {fidHealth.errors.join(", ")}. Issues: {fidHealth.issues.join(", ")}</span>
            )}
            <span style={{ float: 'right', fontSize: '0.92em', fontWeight: 400 }}>FID runtime: {fidHealth.timeMs} ms</span>
          </div>
        )}
        {/* Unified Frontend Guardian Health Banner */}
        {guardianHealth && (
          <div style={{
            background: guardianHealth.status === "healthy" ? '#d1fae5' : guardianHealth.status === "repaired" ? '#fef3c7' : '#fee2e2',
            color: guardianHealth.status === "healthy" ? '#065f46' : guardianHealth.status === "repaired" ? '#92400e' : '#b91c1c',
            padding: '12px 24px',
            margin: '12px',
            borderRadius: 8,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            {guardianHealth.status === "healthy" && (
              <span>🟢 Frontend Guardian: ALL CHECKS PASSED</span>
            )}
            {guardianHealth.status === "repaired" && (
              <span>🟡 Repairs applied. Issues: {guardianHealth.envDoctor?.issues?.join(", ") || "None"}</span>
            )}
            {guardianHealth.status === "failed" && (
              <span>🔴 Errors: {guardianHealth.errors?.join(", ") || "None"}. Issues: {guardianHealth.envDoctor?.issues?.join(", ") || "None"}</span>
            )}
            <span style={{ float: 'right', fontSize: '0.92em', fontWeight: 400 }}>Build checked: {guardianHealth.buildChecked ? "yes" : "no"}</span>
            {/* Deeper error details */}
            {guardianHealth.status === "failed" && (
              <div style={{ marginTop: 8, fontSize: '0.95em', fontWeight: 400 }}>
                <div>Env Doctor Errors:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {guardianHealth.envDoctor?.errors?.length ? guardianHealth.envDoctor.errors.map((err, idx) => (
                    <li key={idx} style={{ color: '#b91c1c' }}>{err}</li>
                  )) : <li style={{ color: '#b91c1c' }}>None</li>}
                </ul>
                <div>Env Doctor Repairs:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {guardianHealth.envDoctor?.repairs?.length ? guardianHealth.envDoctor.repairs.map((rep, idx) => (
                    <li key={idx} style={{ color: '#92400e' }}>{rep}</li>
                  )) : <li style={{ color: '#92400e' }}>None</li>}
                </ul>
                <div>Env Doctor Issues:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {guardianHealth.envDoctor?.issues?.length ? guardianHealth.envDoctor.issues.map((issue, idx) => (
                    <li key={idx} style={{ color: '#b91c1c' }}>{issue}</li>
                  )) : <li style={{ color: '#b91c1c' }}>None</li>}
                </ul>
              </div>
            )}
          </div>
        )}
        {/* Backend Health Certificate Banner */}
        {backendHealth && (
          <div style={{
            background: '#d1fae5',
            color: '#065f46',
            padding: '12px 24px',
            margin: '12px',
            borderRadius: 8,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <span>🟢 Backend Health: {backendHealth.status || backendHealth.message}</span>
            <span style={{ float: 'right', fontSize: '0.92em', fontWeight: 400 }}>Uptime: {backendHealth.uptime ? backendHealth.uptime.toFixed(1) : 'N/A'}s</span>
            <div style={{ marginTop: 8, fontSize: '0.95em', fontWeight: 400 }}>
              <div>Timestamp: {backendHealth.timestamp ? new Date(backendHealth.timestamp).toLocaleString() : 'N/A'}</div>
              <div>Message: {backendHealth.message}</div>
            </div>
          </div>
        )}
        {/* Sidebar */}
        {/* ...existing code... */}
      </div>
    </AgencyLayout>
  );
}