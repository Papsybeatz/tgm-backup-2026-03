
import { useEffect, useState } from "react";
import { useAgency } from "../../agency/hooks/useAgency";
import axios from "axios";

export default function Drafts() {
  const [drafts, setDrafts] = useState([]);
  const { activeClient } = useAgency();

  useEffect(() => {
    const url = activeClient
      ? `/agency/clients/${activeClient}/drafts`
      : "/drafts";
    axios.get(url).then(res => setDrafts(res.data));
  }, [activeClient]);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Your Drafts</h2>
      {drafts.length === 0 ? (
        <p className="text-gray-700 text-lg">
          This is where your saved and in‑progress grant drafts will appear.
        </p>
      ) : (
        <ul>
          {drafts.map(d => (
            <li key={d.id}>{d.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
