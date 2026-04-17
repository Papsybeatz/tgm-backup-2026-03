import { useEffect, useState } from "react";

export default function ContractDrift() {
  const [drift, setDrift] = useState(null);

  useEffect(() => {
    import('../../api/apiClient').then(({ default: apiClient }) => {
      apiClient('/api/contract/drift')
        .then(setDrift)
        .catch(() => setDrift(null));
    });
  }, []);

  if (!drift) return null;

  return (
    <div className="mt-6 p-4 border rounded-md bg-gray-50 text-xs space-y-2">
      <h2 className="text-sm font-semibold">Contract Drift</h2>

      {drift.addedRoutes.length > 0 && (
        <div>🟢 Added routes: {drift.addedRoutes.map(r => r.basePath).join(", ")}</div>
      )}

      {drift.removedRoutes.length > 0 && (
        <div>🔴 Removed routes: {drift.removedRoutes.map(r => r.basePath).join(", ")}</div>
      )}

      {drift.changedMethods.length > 0 && (
        <div>🟡 Method changes detected</div>
      )}

      {drift.newMismatches.length > 0 && (
        <div>🔴 New mismatches: {drift.newMismatches.join(", ")}</div>
      )}

      {drift.resolvedMismatches.length > 0 && (
        <div>🟢 Resolved mismatches: {drift.resolvedMismatches.join(", ")}</div>
      )}
    </div>
  );
}
