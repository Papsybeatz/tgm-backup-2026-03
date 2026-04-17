import React from "react";
import Modal from "./Modal";

export default function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  onRestore,
  restoringId,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Version History">
      <div className="space-y-4 max-h-[400px] overflow-y-auto divide-y divide-gray-100">
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-lg">No saved versions yet. Start writing to activate autosave.</span>
          </div>
        ) : (
          versions.map((v, i) => (
            <div key={v.id || i} className="py-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {new Date(v.timestamp).toLocaleString()}
                </span>
                <button
                  onClick={() => onRestore(v)}
                  className={`px-3 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition duration-200 ${restoringId === v.id ? "opacity-50 pointer-events-none" : ""}`}
                  disabled={restoringId === v.id}
                >
                  {restoringId === v.id ? "Restoring..." : "Restore"}
                </button>
              </div>
              <pre className="text-gray-800 whitespace-pre-wrap text-xs bg-gray-50 rounded p-2 border border-gray-100">
                {v.preview || v.text?.slice(0, 100) || ""}
                {v.text && v.text.length > 100 ? "..." : ""}
              </pre>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
