import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";

export default function RequireAuth({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        // This hits /api/auth/me and verifies the session cookie
        const res = await apiClient("/api/auth/me");
        if (res && res.email) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
      } catch (err) {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  // While checking cookie → render nothing (prevents early Dashboard load)
  if (loading) return null;

  // If not authenticated → redirect to login
  if (!authenticated) return <Navigate to="/login" replace />;

  // Authenticated → render Dashboard or Workspace
  return children;
}
