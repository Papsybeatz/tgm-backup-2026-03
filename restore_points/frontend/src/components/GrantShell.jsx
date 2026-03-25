import { useParams } from "react-router-dom";
import { useGrant } from "../hooks/grants";
import { useAutosaveGrant } from "../hooks/useAutosaveGrant";
import { useState, useEffect } from "react";

export default function GrantShell({ children }) {
  const { grantId } = useParams();
  const { data: grant, isLoading } = useGrant(grantId);

  const [sections, setSections] = useState(null);

  useEffect(() => {
    if (grant && !sections) {
      setSections(grant.workspaceState?.sections || {});
    }
  }, [grant]);

  const { isSaving } = useAutosaveGrant(grantId, sections || {});

  if (isLoading || !sections) return <div>Loading grant...</div>;

  return children({
    grant,
    sections,
    setSections,
    isSaving,
  });
}
