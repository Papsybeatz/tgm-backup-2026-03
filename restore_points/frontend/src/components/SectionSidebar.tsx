import { SECTION_LABELS, SectionKey } from "../lib/sectionTemplates";

export function SectionSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: SectionKey;
  onSelect: (key: SectionKey) => void;
}) {
  return (
    <nav>
      {Object.entries(SECTION_LABELS).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onSelect(key as SectionKey)}
          className={activeSection === key ? "active" : ""}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
