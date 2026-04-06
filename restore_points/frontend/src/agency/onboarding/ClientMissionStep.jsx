import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function ClientMissionStep() {
  const [mission, setMission] = useState("");
  const navigate = useNavigate();
  const { clientId } = useParams();

  async function next() {
    await axios.post(`/agency/clients/${clientId}/onboarding/mission`, { mission });
    navigate("readiness");
  }

  return (
    <div>
      <h3>Client Mission</h3>
      <textarea
        value={mission}
        onChange={e => setMission(e.target.value)}
        placeholder="Describe this client's mission..."
      />
      <button onClick={next}>Next</button>
    </div>
  );
}
