import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function ClientGoalsStep() {
  const [fundingGoal, setFundingGoal] = useState("");
  const [timeline, setTimeline] = useState("");
  const [priorityAreas, setPriorityAreas] = useState("");
  const navigate = useNavigate();
  const { clientId } = useParams();

  async function next() {
    await axios.post(`/agency/clients/${clientId}/onboarding/goals`, {
      fundingGoal: Number(fundingGoal),
      timeline,
      priorityAreas: priorityAreas.split(",").map(s => s.trim())
    });
    navigate("complete");
  }

  return (
    <div>
      <h3>Client Goals</h3>
      <input
        placeholder="Funding Goal"
        value={fundingGoal}
        onChange={e => setFundingGoal(e.target.value)}
      />
      <input
        placeholder="Timeline"
        value={timeline}
        onChange={e => setTimeline(e.target.value)}
      />
      <input
        placeholder="Priority Areas (comma separated)"
        value={priorityAreas}
        onChange={e => setPriorityAreas(e.target.value)}
      />
      <button onClick={next}>Next</button>
    </div>
  );
}
