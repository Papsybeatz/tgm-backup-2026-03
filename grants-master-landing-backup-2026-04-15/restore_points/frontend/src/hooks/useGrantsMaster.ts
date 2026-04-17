import { useMutation } from "@tanstack/react-query";

type GrantsMasterRequest = {
  grantId: string;
  intent:
    | "analyze_fit"
    | "summarize"
    | "outline"
    | "suggest_improvements"
    | "check_completeness";
  payload?: any;
};

export function useGrantsMaster() {
  return useMutation({
    mutationFn: async (body: GrantsMasterRequest) => {
      const res = await fetch("/api/ai/grants-master", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Grants Master failed");
      return res.json();
    },
  });
}
