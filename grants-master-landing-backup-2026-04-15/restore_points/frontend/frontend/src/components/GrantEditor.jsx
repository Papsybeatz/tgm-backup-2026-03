import React, { useState, useEffect } from "react";
import { FiSave, FiEdit3, FiSparkles, FiClock, FiRotateCcw } from "react-icons/fi";

export default function GrantEditor() {
  const [title, setTitle] = useState("Untitled Grant Draft");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [versions, setVersions] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;

  // Manual save (also used by autosave)
  const performSave = () => {
    const timestamp = new Date();
    setSaving(true);

    // Store version snapshot
    setVersions((prev) => [
      {
        id: timestamp.getTime(),
        title,
        content,
        savedAt: timestamp,
      },
      ...prev,
    ]);

    setLastSavedAt(timestamp);
    setTimeout(() => setSaving(false), 500);
  };

  const handleSaveClick = () => {
    performSave();
  };

  // Autosave after user stops typing for 2 seconds
  useEffect(() => {
    if (!content && !title) return;

    const timeout = setTimeout(() => {
      performSave();
    }, 2000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  const runAIAction = async (action) => {
    setLoadingAction(action);

    try {
      const res = await fetch(`${API_URL}/ai/editor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          title,
          content,
        }),
      });

      const data = await res.json();

      if (data?.output) {
        setContent(data.output);
      }
    } catch (err) {
      console.error("AI action failed:", err);
    }

    setLoadingAction(null);
  };

  const formatTime = (date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const restoreVersion = (version) => {
    setTitle(version.title);
    setContent(version.content);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor column */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <input
            className="w-full text-2xl font-semibold text-gray-800 border-none focus:ring-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSaveClick}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <FiSave />
              Save now
            </button>

            <span className="text-sm text-gray-500">
              {saving
                ? "Saving..."
                : lastSavedAt
                ? `Saved at ${formatTime(lastSavedAt)}`
                : "Not yet saved"}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <textarea
            className="w-full h-[70vh] resize-none border-none focus:ring-0 text-gray-800 leading-relaxed"
            placeholder="Start writing your grant proposal here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </div>

      {/* Right column: AI + Versions */}
      <div className="space-y-4">
        {/* AI Assistant */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            AI Writing Assistant
          </h2>

          <AIAction
            label="Improve clarity"
            icon={<FiSparkles />}
            loading={loadingAction === "improve_clarity"}
            onClick={() => runAIAction("improve_clarity")}
          />

          <AIAction
            label="Expand section"
            icon={<FiEdit3 />}
            loading={loadingAction === "expand_section"}
            onClick={() => runAIAction("expand_section")}
          />

          <AIAction
            label="Rewrite professionally"
            icon={<FiSparkles />}
            loading={loadingAction === "rewrite_professional"}
            onClick={() => runAIAction("rewrite_professional")}
          />

          <AIAction
            label="Align with funder mission"
            icon={<FiSparkles />}
            loading={loadingAction === "align_mission"}
            onClick={() => runAIAction("align_mission")}
          />
        </div>

        {/* Version history */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FiClock />
            Version history
          </h2>

          {versions.length === 0 && (
            <p className="text-sm text-gray-500">
              Versions will appear here as you write.
            </p>
          )}

          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => restoreVersion(v)}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-800">
                    {v.title || "Untitled draft"}
                  </span>
                  <span className="text-gray-500 text-xs">
                    Saved at {formatTime(v.savedAt)}
                  </span>
                </div>
                <FiRotateCcw className="text-gray-400" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AIAction({ label, icon, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-800 text-sm font-medium mb-2"
    >
      <span className="text-lg">{icon}</span>
      <span>{loading ? "Working..." : label}</span>
    </button>
  );
}
