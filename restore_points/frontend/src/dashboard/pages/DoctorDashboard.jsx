import FrontendHealthDashboard from "../../routes/FrontendHealthDashboard.jsx";

export default function DoctorDashboard() {
  return (
    <div>
      <h1>Doctor Dashboard</h1>
      <p>Enterprise Doctor system health overview.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Replace BackendHealthDashboard with your actual backend health component if available */}
        <div>
          <h2>Backend Health</h2>
          {/* Backend health panel goes here */}
        </div>
        <FrontendHealthDashboard />
      </div>
    </div>
  );
}
