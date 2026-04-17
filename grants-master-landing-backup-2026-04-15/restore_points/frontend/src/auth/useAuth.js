import { useContext, createContext } from "react";

// Dummy context for demonstration; replace with your real auth logic
export const AuthContext = createContext({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}
