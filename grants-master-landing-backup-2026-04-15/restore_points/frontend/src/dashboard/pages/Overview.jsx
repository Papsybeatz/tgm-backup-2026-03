import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/apiClient";
import DashboardNewGrantModal from "../components/DashboardNewGrantModal";

export default function Overview() {
  const [grants, setGrants] = useState([]);
  const [showNewGrantModal, setShowNewGrantModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadGrants() {
      const res = await apiClient("/api/grants");
      setGrants(res || []);
    }
    loadGrants();
  }, []);

  function handleGrantCreated(id) {
    async function reload() {
      const res = await apiClient("/api/grants");
      setGrants(res || []);
    }
    reload();
    navigate(`/dashboard/workspace?grantId=${id}`);
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Your Grants</h2>

      <div className="flex items-center mb-6">
        <button
          onClick={() => setShowNewGrantModal(true)}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg"
        >
          + New
        </button>
      </div>

      {/* Grant List */}
      <div className="grid md:grid-cols-3 gap-6">
        {grants.length === 0 ? (
          <div className="col-span-3 text-gray-500 text-lg">No grants yet. Click + New to create your first grant.</div>
        ) : (
          grants.map(grant => (
            <div key={grant.id} className="p-6 bg-white border rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-2">{grant.title || 'Untitled Grant'}</h3>
              <p className="text-gray-600">Last updated: {grant.updatedAt ? new Date(grant.updatedAt).toLocaleString() : 'N/A'}</p>
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
                onClick={() => navigate(`/dashboard/workspace?grantId=${grant.id}`)}
              >
                Open
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <DashboardNewGrantModal
        isOpen={showNewGrantModal}
        onClose={() => setShowNewGrantModal(false)}
        onGrantCreated={handleGrantCreated}
      />
    </div>
  );
}
