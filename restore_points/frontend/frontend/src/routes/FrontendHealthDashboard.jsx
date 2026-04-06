import { useEffect, useState } from "react";

export default function FrontendHealthDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/frontend/health")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  if (!data) return <div>Loading frontend health…</div>;

  const { frontendHealth, logs } = data;

  const statusColor =
    frontendHealth.status === "ok"
      ? "green"
      : frontendHealth.status === "down"
      ? "red"
      : "orange";

  return (
    <div style={{ padding: "20px" }}>
      <h2>Frontend Health</h2>

      <div
        style={{
          padding: "10px",
          borderRadius: "8px",
          background: statusColor,
          color: "white",
          marginBottom: "20px"
        }}
      >
        <strong>Status:</strong> {frontendHealth.status}
        <br />
        <strong>Timestamp:</strong> {frontendHealth.timestamp}
      </div>

      <h3>Guardian Logs</h3>
      {Object.keys(logs).map((file) => (
        <div
          key={file}
          style={{
            marginBottom: "20px",
            padding: "10px",
            background: "#f0f0f0",
            borderRadius: "6px"
          }}
        >
          <strong>{file}</strong>
          <pre style={{ whiteSpace: "pre-wrap" }}>{logs[file]}</pre>
        </div>
      ))}
    </div>
  );
}
