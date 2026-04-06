import { useQuery } from "@tanstack/react-query";

export function useActivityLog(grantId: string | null) {
  return useQuery({
    queryKey: ["activityLog", grantId],
    enabled: Boolean(grantId),
    queryFn: async () => {
      const res = await fetch(`/api/activity/grant/${grantId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch activity log");
      return res.json();
    },
  });
}
