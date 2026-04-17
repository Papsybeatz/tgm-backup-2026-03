import { useQuery } from "@tanstack/react-query";

export function useGrant(id: string | number | null) {
  return useQuery({
    queryKey: ["grant", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/grants/${id}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch grant ${id}: ${text}`);
      }

      return res.json();
    },
  });
}
