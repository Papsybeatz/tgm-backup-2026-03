import { useState } from "react";
import ClientList from "../agency/ClientList";
import AddClientModal from "../agency/AddClientModal";

export default function AgencyDashboard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <h1>Agency Tools</h1>
      <ClientList onAddClient={() => setShowModal(true)} />
      {showModal && (
        <AddClientModal onClose={() => window.location.reload()} />
      )}
    </div>
  );
}
