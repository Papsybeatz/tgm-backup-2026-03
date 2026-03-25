import { useActivityLog } from "../hooks/useActivityLog";

export function ActivityLogPanel({ grantId }: { grantId: string }) {
  const { data: logs, isLoading } = useActivityLog(grantId);

  if (isLoading) return <div>Loading activity…</div>;
  if (!logs?.length) return <div>No activity yet.</div>;

  return (
    <div className="activity-log">
      {logs.map((log) => (
        <div key={log.id} className="activity-item">
          <div className="activity-message">{log.message}</div>
          <div className="activity-meta">
            <span>{new Date(log.createdAt).toLocaleString()}</span>
            <span className="activity-type">{log.type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
