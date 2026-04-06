export type SectionKey =
  | "coverLetter"
  | "narrative"
  | "orgBackground"
  | "budget"
  | "attachments";

export const DEFAULT_SECTIONS: Record<SectionKey, string> = {
  coverLetter: "",
  narrative: "",
  orgBackground: "",
  budget: "",
  attachments: "",
};

export function buildSectionStateFromGrant(grant: any): Record<string, string> {
  const stored = grant?.workspaceState?.sections || {};
  return {
    ...DEFAULT_SECTIONS,
    ...stored,
  };
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  coverLetter: "Cover Letter",
  narrative: "Project Narrative",
  orgBackground: "Organization Background",
  budget: "Budget & Justification",
  attachments: "Attachments / Supporting Docs",
};
