import { useState } from "react";
import axios from "axios";

export default function AddClientModal({ onClose }) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");

  async function createClient() {
    await axios.post("/agency/clients", { name, sector });
    onClose(true);
  }

  return (
    <div className="modal">
      <div className="modal-body">
        <h3>Add Client</h3>

        <input
          placeholder="Client Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          placeholder="Sector"
          value={sector}
          onChange={e => setSector(e.target.value)}
        />

        <button onClick={createClient}>Create</button>
        <button onClick={() => onClose(false)}>Cancel</button>
      </div>
    </div>
  );
}
