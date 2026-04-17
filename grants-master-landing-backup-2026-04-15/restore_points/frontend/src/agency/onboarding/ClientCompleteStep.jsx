import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function ClientCompleteStep() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function finalize() {
      const res = await axios.post(
        `/agency/clients/${clientId}/onboarding/complete`
      );
      navigate(`/dashboard/drafts/${res.data.draftId}`);
    }
    finalize();
  }, [clientId, navigate]);

  return (
    <div>
      <h3>Setting up client workspace...</h3>
      <p>Creating their first draft and preparing their workspace.</p>
    </div>
  );
}
