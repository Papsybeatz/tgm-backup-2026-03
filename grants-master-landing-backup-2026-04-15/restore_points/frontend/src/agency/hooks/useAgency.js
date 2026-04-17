import { useEffect, useState } from "react";
import axios from "axios";

export function useAgency() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);

  useEffect(() => {
    axios.get("/agency/clients").then(res => setClients(res.data || []));
    axios.get("/me").then(res => setActiveClient(res.data?.user?.activeClientId || null));
  }, []);

  async function switchClient(clientId) {
    await axios.post("/agency/switch", { clientId });
    setActiveClient(clientId);
    window.location.reload();
  }

  return { clients, activeClient, switchClient };
}
