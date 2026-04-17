import ClientWorkspaceHeader from "./ClientWorkspaceHeader";

export default function AgencyLayout({ children }) {
  return (
    <div className="agency-layout">
      <ClientWorkspaceHeader />
      <div className="agency-content">{children}</div>
    </div>
  );
}
