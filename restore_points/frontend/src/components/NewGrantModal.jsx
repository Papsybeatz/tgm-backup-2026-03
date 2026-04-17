import { useState, useRef, useEffect } from "react";
import { apiClient } from "../api/apiClient";

export default function NewGrantModal({ isOpen, onClose, onGrantCreated }) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const modalRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient("/api/grants", {
        method: "POST",
        body: JSON.stringify({ title }),
      });

      // Normalize backend response
      const newGrantId =
        res?.id ||
        res?.grantId ||
        res?.grant?.id ||
        res?.data?.id;

      if (!newGrantId) {
        throw new Error("Invalid response from server");
      }

      // Close modal
      onClose();

      // Notify parent (sidebar)
      onGrantCreated(newGrantId);

    } catch (err) {
      console.error("Grant creation failed:", err);
      setError("Failed to create grant");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white w-[400px] rounded-xl shadow-lg p-6"
      >
        <h2 className="text-xl font-bold mb-4">Create New Grant</h2>

        <label className="block text-sm font-medium mb-1">Grant Title</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {error && (
          <div className="text-red-600 text-sm mb-3">{error}</div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
