import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function ClientReadinessStep() {
  const [nonprofitType, setNonprofitType] = useState("");
  const [hasFinancials, setHasFinancials] = useState(false);
  const [staffCount, setStaffCount] = useState(0);
  const navigate = useNavigate();
  const { clientId } = useParams();

  async function next() {
    await axios.post(`/agency/clients/${clientId}/onboarding/readiness`, {
      nonprofitType,
      hasFinancials,
      staffCount
    });
    navigate("goals");
  }

  return (
    <div>
      <h3>Client Readiness</h3>
      <input
        placeholder="Nonprofit Type"
        value={nonprofitType}
        onChange={e => setNonprofitType(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={hasFinancials}
          onChange={e => setHasFinancials(e.target.checked)}
        />
        Has financials ready
      </label>
      <input
        type="number"
        value={staffCount}
        onChange={e => setStaffCount(e.target.value)}
        placeholder="Staff count"
      />
      <button onClick={next}>Next</button>
    </div>
  );
}
