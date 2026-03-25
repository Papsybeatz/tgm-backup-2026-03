import { useAgency } from "./hooks/useAgency";

export default function ClientSwitcher() {
  const { clients, switchClient, activeClient } = useAgency();

  return (
    <select value={activeClient || ""} onChange={e => switchClient(e.target.value)}>
      <option value="">Select Client</option>
      {clients.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
