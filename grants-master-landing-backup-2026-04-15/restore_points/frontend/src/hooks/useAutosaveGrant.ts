import { useEffect, useRef } from "react";
import { useUpdateGrant } from "./grants";

export function useAutosaveGrant(grantId, sections) {
  const updateGrant = useUpdateGrant(grantId);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const lastSaved = useRef(JSON.stringify(sections));

  useEffect(() => {
    const serialized = JSON.stringify(sections);

    if (serialized === lastSaved.current) return;

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      updateGrant.mutate({
        workspaceState: { sections },
        lastEditedAt: new Date().toISOString(),
      });

      lastSaved.current = serialized;
    }, 800);
  }, [sections, grantId]);

  return {
    isSaving: updateGrant.isPending,
  };
}
