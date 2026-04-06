import { useParams } from "react-router-dom";
import { useGrant } from "../hooks/grants";
import { useAutosaveGrant } from "../hooks/useAutosaveGrant";
import { useState, useEffect, ReactNode } from "react";
import { buildSectionStateFromGrant } from "../lib/sectionTemplates";

type GrantShellRenderProps = {
  grant: any;
  sections: Record<string, string>;
  setSections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isSaving: boolean;
  agentContext: {
    grantId: string;
    title: string;
    funder?: string;
    status?: string;
  };
};

export default function GrantShell({
  children,
}: {
  children: (props: GrantShellRenderProps) => ReactNode;
}) {
  const { grantId } = useParams();
  const { data: grant, isLoading, error } = useGrant(grantId || null);

  const [sections, setSections] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (grant && !sections) {
      setSections(buildSectionStateFromGrant(grant));
    }
  }, [grant]);

  const { isSaving } = useAutosaveGrant(grantId, sections || {});

  if (isLoading) return <div>Loading grant…</div>;
  if (error) return <div>Failed to load grant.</div>;
  if (!grant || !sections) return <div>No grant found.</div>;

  const agentContext = {
    grantId: String(grant.id),
    title: grant.title,
    funder: grant.funder,
    status: grant.status,
  };

  return (
    <>
      {children({
        grant,
        sections,
        setSections,
        isSaving,
        agentContext,
      })}
    </>
  );
}
