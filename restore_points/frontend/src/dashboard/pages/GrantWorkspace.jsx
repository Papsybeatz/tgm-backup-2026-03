import { useState, useEffect } from "react";
import { apiClient } from '../../api/apiClient';
import { useSearchParams, useNavigate } from "react-router-dom";
import GrantSidebar from "../../components/sidebar/GrantSidebar";
import { useAutosave } from "../../hooks/useAutosave";
import VersionHistoryModal from "../../components/VersionHistoryModal";
import OnboardingOverlay from "../../components/OnboardingOverlay";
import TooltipWrapper from "../../components/TooltipWrapper";
import { useQuery } from '@tanstack/react-query';

export default function GrantWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const grantId = searchParams.get("grantId");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [versions, setVersions] = useState({});
  const [restoringId, setRestoringId] = useState(null);
  const [toast, setToast] = useState("");

  const SECTIONS = [
    "Problem Statement",
    "Organization Background",
    "Project Description",
    "Budget",
    "Evaluation Plan",
    "Sustainability",
    "Attachments"
  ];

  const [userSession, setUserSession] = useState({
    firstVisit: true,
    userTier: "Free",
    hasSeenOnboarding: false,
    isDemo: false,
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTIONS[0]);

  const [content, setContent] = useState({
    "Problem Statement": "",
    "Organization Background": "",
    "Project Description": "",
  });

  const handleChange = (e) => {
    setContent({
      ...content,
      [activeSection]: e.target.value
    });
  };

  const [draftId, setDraftId] = useState(null);
  const autosaveStatus = useAutosave({
    content: content?.[activeSection] ?? "",
    title: activeSection,
    email: userSession?.email || "demo@user.com",
    draftId,
    onSaved: (id) => setDraftId(id),
  });

  // Load grant data
  const { data: grant, isLoading: grantLoading, error: grantError } = useQuery({
    queryKey: ['grant', grantId],
    queryFn: async () => {
      if (!grantId) return null;
      const res = await apiClient(`/api/grants/${grantId}`);
      return res;
    },
    enabled: !!grantId,
  });

  useEffect(() => {
    console.log("[GrantWorkspace] grantId:", grantId);
    console.log("[GrantWorkspace] grant:", grant);
  }, [grantId, grant]);

  useEffect(() => {
    if (grant && grant.workspaceState) {
      setContent({ ...content, ...grant.workspaceState.sections });
    }
  }, [grantId, grant]);

  useEffect(() => {
    console.log("[GrantWorkspace] content state:", content);
  }, [content]);

  // Unified AI handler
  async function handleAIMode(mode) {
    if (!content[activeSection] || content[activeSection].trim() === "") return;
    setLoading(true);
    try {
      const res = await apiClient("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          input: content[activeSection],
          mode,
        }),
      });
      setContent({
        ...content,
        [activeSection]: res.output,
      });
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-6">
      {/* SIDEBAR */}
      <GrantSidebar
        activeGrantId={grantId || undefined}
        onGrantCreated={newGrantId => setSearchParams({ grantId: newGrantId })}
      />
      {/* SECTION NAVIGATION */}
      <aside className="w-64 bg-white border border-gray-200 rounded-xl p-4 h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Sections</h3>
        <div className="space-y-2">
          {SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                activeSection === section
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </aside>
      {/* MAIN EDITOR */}
      <main className="flex-1 bg-white border border-gray-200 rounded-xl p-6">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-4 border-b border-gray-100 pb-2">
          <h2 className="text-2xl font-bold">{activeSection}</h2>
          <TooltipWrapper tooltip="Your draft is autosaved every 2 seconds." show={showOnboarding}>
            <div className="text-xs text-gray-500">
              {autosaveStatus === "saving" && "Saving..."}
              {autosaveStatus === "saved" && "Saved"}
            </div>
          </TooltipWrapper>
        </div>
        {/* AI TOOLBAR */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => handleAIMode("improve")}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Improve
          </button>
          <button
            onClick={() => handleAIMode("expand")}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
          >
            Expand
          </button>
          <button
            onClick={() => handleAIMode("shorten")}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
          >
            Shorten
          </button>
          <button
            onClick={() => handleAIMode("formal")}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
          >
            Formalize
          </button>
          <button
            onClick={() => handleAIMode("rewrite")}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
          >
            Rewrite
          </button>
        </div>
        {/* EDITOR */}
        <textarea
          className="w-full min-h-[200px] h-[60vh] max-h-[85vh] resize-y border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={content[activeSection] || ""}
          onChange={handleChange}
        />
        {/* VERSION HISTORY */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowHistory(true)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Version History
          </button>
        </div>
        {showHistory && (
          <VersionHistoryModal
            versions={versions[activeSection] || []}
            onClose={() => setShowHistory(false)}
            onRestore={(id) => setRestoringId(id)}
          />
        )}
      </main>
    </div>
  );
}
