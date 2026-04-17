import TierGateBanner from "../../components/TierGateBanner.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/apiClient";
import { useAuth } from "../../auth/useAuth";
import DashboardNewGrantModal from "../components/DashboardNewGrantModal.jsx";
import SubscriptionSummaryCard from "../../components/SubscriptionSummaryCard.jsx";

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewGrantModal, setShowNewGrantModal] = useState(false);

  // Load grants for "Your Grants" section
  async function loadGrants() {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient("/api/grants");
      setGrants(Array.isArray(res) ? res : []);
    } catch (err) {
      setError("Failed to load your grants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadGrants();
    }
  }, [authLoading, user]);

  async function handleGrantCreated(newGrantId) {
    await loadGrants();
    navigate(`/dashboard/workspace?grantId=${newGrantId}`);
  }

  function handleGrantClick(grantId) {
    navigate(`/dashboard/workspace?grantId=${grantId}`);
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>

      <div className="dashboard-section flex items-center justify-between">
        <h2>Your Grants</h2>
        <button
          onClick={() => setShowNewGrantModal(true)}
          className="primary"
        >
          + New
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Subscription Summary Card */}
        <SubscriptionSummaryCard
          plan={"Pro"}
          renewalDate={"March 15, 2026"}
          paymentMethod={"**** 4242"}
          onManage={() => window.location.href = "https://billing.stripe.com/p/login/test_portal_link"}
          benefits={["Full AI editor", "Scoring", "Matching", "Unlimited drafts"]}
        />

        {/* Example: Quick Actions Card */}
        <div className="card">
          <h3>Quick Actions</h3>
          {/* TODO: Add icon+label buttons, grid, tooltips */}
          <div className="skeleton-line" style={{width:'60%'}} />
        </div>

        {/* Example: Recent Drafts Card */}
        <div className="card">
          <h3>Recent Drafts</h3>
          {loading ? (
            <div className="skeleton-card">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ) : error ? (
            <div className="text-danger">{error}</div>
          ) : grants.length === 0 ? (
            <div className="text-muted" style={{textAlign:'center',padding:'2rem 0'}}>
              No drafts yet — <button className="primary" onClick={() => setShowNewGrantModal(true)}>Start your first one with AI</button>.
            </div>
          ) : (
            <ul style={{margin:0,padding:0,listStyle:'none'}}>
              {grants.slice(0,3).map(grant => (
                <li key={grant.id} className="draft-item" style={{marginBottom:'1rem'}}>
                  <h4 style={{marginBottom:'0.25rem'}}>{grant.title || 'Untitled Grant'}</h4>
                  <p style={{fontSize:'0.9em'}}>Last edited {grant.updatedAt ? new Date(grant.updatedAt).toLocaleString() : 'N/A'}</p>
                  <button className="secondary" onClick={()=>handleGrantClick(grant.id)}>Continue writing</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Example: Recommended Grants Card */}
        <div className="card">
          <h3>Recommended Grants</h3>
          {/* Example upgrade banner for locked matching */}
          <TierGateBanner
            tier="Pro"
            feature="matching"
            explanation="Unlock personalized grant recommendations."
            onUpgrade={() => window.location.href = "/pricing"}
            tooltip="Upgrade to access matching"
          />
          <div className="skeleton-line" style={{width:'70%'}} />
        </div>
      </div>

      <DashboardNewGrantModal
        isOpen={showNewGrantModal}
        onClose={() => setShowNewGrantModal(false)}
        onGrantCreated={handleGrantCreated}
      />
    </div>
  );
}
