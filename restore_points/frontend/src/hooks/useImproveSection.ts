import { useMutation } from "@tanstack/react-query";

export function useImproveSection() {
  return useMutation({
    mutationFn: async (payload: {
      grantId: string;
      sectionKey: string;
      text: string;
    }) => {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to improve section");
      return res.json() as Promise<{ improvedText: string }>;
    },
  });
}
