import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGrant } from "../../api/grants";

export default function DashboardNewGrantModal({ isOpen, onClose, onGrantCreated }) {
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();

  const createGrantMutation = useMutation({
    mutationFn: () => createGrant(title),
    onSuccess: (newGrant) => {
      queryClient.invalidateQueries(["grants"]);
      setTitle("");
      onClose();
      if (onGrantCreated) {
        onGrantCreated(newGrant.id);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4">New Grant</h2>

        <input
          type="text"
          placeholder="Grant title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded"
          >
            Cancel
          </button>

          <button
            onClick={() => createGrantMutation.mutate()}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
