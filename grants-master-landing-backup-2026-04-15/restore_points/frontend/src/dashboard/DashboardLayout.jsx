

import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useGrants } from "../hooks/useGrants";

import AgencyLayout from "../agency/AgencyLayout";
import ClientWorkspaceBanner from "../components/ClientWorkspaceBanner.jsx";
import { useAgency } from "../agency/hooks/useAgency";
import ClientList from "../agency/ClientList";
import AddClientModal from "../agency/AddClientModal";
import ClientWorkspaceHeader from "../agency/ClientWorkspaceHeader";

import GrantSidebar from "../components/sidebar/GrantSidebar.tsx";
import DashboardNewGrantModal from "./components/DashboardNewGrantModal.jsx";

export default function DashboardLayout() {
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


  const { activeClient, clients, switchClient } = useAgency();
  const safeClients = Array.isArray(clients) ? clients : [];
  const client = safeClients.find(c => c.id === activeClient);
  return (
    <AgencyLayout>
      <div className="flex h-screen" style={{ background: client ? 'rgba(47,128,237,0.03)' : undefined }}>
        {/* Sidebar */}
        <div>
          <ClientList onAddClient={() => {}} />
          <GrantSidebar
            activeGrantId={grantId}
            grants={grants}
            isLoading={isLoading}
            isError={isError}
            onSelectGrant={handleSelectGrant}
            onNewGrantClick={() => setIsNewGrantModalOpen(true)}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {client && (
            <ClientWorkspaceBanner client={client} onSwitchClient={switchClient} clients={clients} />
          )}
          <div style={{ marginBottom: 8, marginLeft: 24 }}>
            {client && (
              <span className="text-muted" style={{ fontSize: '0.98em' }}>
                You are working on behalf of: <b>{client.name}</b>
              </span>
            )}
          </div>
          <ClientWorkspaceHeader />
          <Outlet />
        </div>

        {/* New Grant Modal (owned by layout) */}
        <DashboardNewGrantModal
          isOpen={isNewGrantModalOpen}
          onClose={() => setIsNewGrantModalOpen(false)}
          onGrantCreated={handleGrantCreated}
        />
      </div>
    </AgencyLayout>
  );
}
