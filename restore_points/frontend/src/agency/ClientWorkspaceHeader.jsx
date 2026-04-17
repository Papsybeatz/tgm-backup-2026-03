import { useAgency } from "./hooks/useAgency";

export default function ClientWorkspaceHeader() {
  const { clients, activeClient, switchClient } = useAgency();

  if (!activeClient) return null;

  const client = clients.find(c => c.id === activeClient);

  return (
    <div className="client-header">
      <div>
        <h2>{client.name}</h2>
        <p>Sector: {client.sector || "Not specified"}</p>
      </div>

      <button onClick={() => switchClient(null)}>Exit Client Workspace</button>
    </div>
  );
}
