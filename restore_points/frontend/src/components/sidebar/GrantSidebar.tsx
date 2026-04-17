
import React from "react";

export default function GrantSidebar({
  activeGrantId,
  grants,
  isLoading,
  isError,
  onSelectGrant,
  onNewGrantClick,
}) {
  return (
    <div className="w-64 bg-gray-50 border-r h-full flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b">
        <h2 className="font-semibold text-gray-800">Your Grants</h2>

        <button
          onClick={onNewGrantClick}
          className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
        >
          + New
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-4 text-gray-500 text-sm">Loading grants...</div>
      )}

      {/* Error */}
      {isError && (
        <div className="p-4 text-red-500 text-sm">
          Failed to load grants.
        </div>
      )}

      {/* Empty State */}
      {!isLoading && grants?.length === 0 && (
        <div className="p-4 text-gray-500 text-sm">
          You don’t have any grants yet.
          <br />
          Click “New” to create one.
        </div>
      )}

      {/* Grant List */}
      <div className="flex-1 overflow-y-auto">
        {grants?.map((grant: any) => (
          <div
            key={grant.id}
            onClick={() => onSelectGrant(grant.id)}
            className={`p-3 cursor-pointer border-b hover:bg-gray-100 ${
              activeGrantId === grant.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="font-medium text-gray-800">{grant.title}</div>
            <div className="text-xs text-gray-500">
              {new Date(grant.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
