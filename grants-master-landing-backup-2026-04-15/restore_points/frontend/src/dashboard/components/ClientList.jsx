import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ClientList({ switchClient }) {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get("/agency/clients")
      .then(res => setClients(res.data))
      .catch(err => setError("Unable to load clients."));
  }, []);

  if (error) return <div className="card">{error}</div>;

  return (
    <div className="card">
      <h3>Your Clients</h3>
      <ul>
        {clients.map(c => (
          <li key={c.id}>
            <button onClick={() => switchClient(c.id)}>
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
