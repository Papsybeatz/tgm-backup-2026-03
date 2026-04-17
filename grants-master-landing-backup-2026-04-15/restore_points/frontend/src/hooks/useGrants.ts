import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/apiClient";

export function useGrants() {
  const query = useQuery({
    queryKey: ["grants"],
    queryFn: () => apiClient("/api/grants"),
    staleTime: 1000 * 30, // 30 seconds (tunable)
  });

  return {
    grants: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
