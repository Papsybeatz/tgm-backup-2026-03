
import React, { useState } from "react";
import { GRANT_SECTIONS } from "../data/sections";
import { FUNDER_TEMPLATES } from "../data/funderTemplates";
import {
  FiSparkles,
  FiEdit3,
  FiRotateCcw,
  FiStar,
  FiTarget,
} from "react-icons/fi";

export default function MultiSectionEditor() {
  const [sections, setSections] = useState(
    GRANT_SECTIONS.map((s) => ({
      ...s,
      content: "",
      versions: [],
      saving: false,
      lastSavedAt: null,
      loading: null,
      score: null,
      feedback: null,
    }))
  );
  const [selectedFunder, setSelectedFunder] = useState("generic");

  const API_URL = import.meta.env.VITE_API_URL;

  const updateSection = (id, updates) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const autosave = (section) => {
    const timestamp = new Date();

    updateSection(section.id, {
      saving: true,
      lastSavedAt: timestamp,
      versions: [
        {
          id: timestamp.getTime(),
          content: section.content,
          savedAt: timestamp,
        },
        ...section.versions,
      ],
    });

    setTimeout(() => {
      updateSection(section.id, { saving: false });
    }, 400);
  };

  const handleTyping = (section, value) => {
    updateSection(section.id, { content: value });

    clearTimeout(section._timeout);
    section._timeout = setTimeout(() => autosave(section), 1200);
  };

  const runAIAction = async (section, action) => {
    updateSection(section.id, { loading: action });

    try {
      const res = await fetch(`${API_URL}/ai/editor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          section: section.id,
          content: section.content,
          funder: selectedFunder,
        }),
      });

      const data = await res.json();

      if (data?.output) {
        updateSection(section.id, { content: data.output });
      }

      if (data?.score !== undefined || data?.feedback) {
        updateSection(section.id, {
          score: data.score ?? null,
          feedback: data.feedback ?? null,
        });
      }
    } catch (err) {
      console.error(err);
    }

    updateSection(section.id, { loading: null });
  };

  const requestScoring = (section) => {
    runAIAction(section, "score_section");
  };

  const applyTemplate = (section) => {
    const template =
      FUNDER_TEMPLATES[selectedFunder]?.[section.id] ||
      FUNDER_TEMPLATES.generic[section.id] ||
      "";
    updateSection(section.id, { content: template });
  };

  const restoreVersion = (section, version) => {
    updateSection(section.id, { content: version.content });
  };

  const formatTime = (date) =>
    date?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const scoreColor = (score) => {
    if (score == null) return "";
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <div className="space-y-8">
      {/* Funder selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          Structured Grant Editor
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Funder profile:</span>
          <select
            className="text-sm border border-gray-300 rounded-lg px-2 py-1"
            value={selectedFunder}
            onChange={(e) => setSelectedFunder(e.target.value)}
          >
            <option value="generic">Generic foundation</option>
            {/* add more funders later */}
          </select>
        </div>
      </div>

      {sections.map((section) => (
        <div
          key={section.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-semibold text-gray-800">
              {section.label}
            </h2>

            <div className="flex items-center gap-4">
              {section.score != null && (
                <div className="flex items-center gap-1 text-sm">
                  <FiStar className={scoreColor(section.score)} />
                  <span className={scoreColor(section.score)}>
                    {section.score}/100
                  </span>
                </div>
              )}
              <button
                onClick={() => applyTemplate(section)}
                className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FiTarget />
                Use template
              </button>
            </div>
          </div>

          <textarea
            className="w-full h-48 resize-none border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
            placeholder={`Write the ${section.label.toLowerCase()}...`}
            value={section.content}
            onChange={(e) => handleTyping(section, e.target.value)}
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-500">
              {section.saving
                ? "Saving..."
                : section.lastSavedAt
                ? `Saved at ${formatTime(section.lastSavedAt)}`
                : "Not yet saved"}
            </span>

            <div className="flex gap-2">
              <AIButton
                label="Improve clarity"
                icon={<FiSparkles />}
                loading={section.loading === "improve_clarity"}
                onClick={() => runAIAction(section, "improve_clarity")}
              />
              <AIButton
                label="Expand"
                icon={<FiEdit3 />}
                loading={section.loading === "expand_section"}
                onClick={() => runAIAction(section, "expand_section")}
              />
              <AIButton
                label="Score section"
                icon={<FiStar />}
                loading={section.loading === "score_section"}
                onClick={() => requestScoring(section)}
              />
            </div>
          </div>

          {section.feedback && (
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-900">
              <p className="font-semibold mb-1">AI feedback</p>
              <p>{section.feedback}</p>
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Version history
            </h3>

            {section.versions.length === 0 && (
              <p className="text-sm text-gray-500">
                Versions will appear here as you write.
              </p>
            )}

            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {section.versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => restoreVersion(section, v)}
                >
                  <span className="text-sm text-gray-700">
                    Saved at {formatTime(v.savedAt)}
                  </span>
                  <FiRotateCcw className="text-gray-400" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function AIButton({ label, icon, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium"
    >
      {icon}
      {loading ? "Working..." : label}
    </button>
  );
}
