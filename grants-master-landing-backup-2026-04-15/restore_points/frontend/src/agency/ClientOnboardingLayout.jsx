import { Outlet, useParams } from "react-router-dom";

export default function ClientOnboardingLayout() {
  const { clientId } = useParams();
  return (
    <div className="onboarding-container">
      <h2>Onboarding Client</h2>
      <p>Client ID: {clientId}</p>
      <Outlet />
    </div>
  );
}
