import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useGrants } from "../hooks/useGrants";

export default function WorkspaceLayout() {
  const navigate = useNavigate();
  const { grantId } = useParams();

  // Modal state is owned by the layout
  const [isNewGrantModalOpen, setIsNewGrantModalOpen] = useState(false);

  // Fetch all grants (shared across sidebar + workspace)
  const { grants, isLoading, isError } = useGrants();

  // When user selects a grant from the sidebar
  const handleSelectGrant = (id) => {
    navigate(`/dashboard/workspace/${id}`);
  };

  // When a new grant is created from the modal
  const handleGrantCreated = (id) => {
    setIsNewGrantModalOpen(false);
    navigate(`/dashboard/workspace/${id}`);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <GrantSidebar
        activeGrantId={grantId}
        grants={grants}
        isLoading={isLoading}
        isError={isError}
        onSelectGrant={handleSelectGrant}
        onNewGrantClick={() => setIsNewGrantModalOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* New Grant Modal (owned by layout) */}
      <DashboardNewGrantModal
        isOpen={isNewGrantModalOpen}
        onClose={() => setIsNewGrantModalOpen(false)}
        onGrantCreated={handleGrantCreated}
      />
    </div>
  );
}
