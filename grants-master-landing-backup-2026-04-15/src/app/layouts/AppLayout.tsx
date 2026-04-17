import { useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Outlet, useLocation } from "react-router-dom";

export const AppLayout = () => {
  const { i18n } = useI18n();
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/dashboard")) {
      i18n.loadNamespaces(["dashboard"]);
    } else if (pathname.startsWith("/auth")) {
      i18n.loadNamespaces(["auth"]);
    } else {
      i18n.loadNamespaces(["common"]);
    }
  }, [pathname, i18n]);

  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
};
