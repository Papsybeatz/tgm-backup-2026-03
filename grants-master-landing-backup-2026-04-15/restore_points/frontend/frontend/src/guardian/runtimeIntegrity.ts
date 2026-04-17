export type RuntimeIssue = {
  type: "route" | "import" | "config";
  message: string;
};

export type RuntimeIntegrityResult = {
  status: "healthy" | "warning";
  issues: RuntimeIssue[];
};

export function checkRuntimeIntegrity(): RuntimeIntegrityResult {
  const issues: RuntimeIssue[] = [];

  // Example: ensure critical globals exist
  if (typeof window === "undefined") {
    issues.push({
      type: "config",
      message: "window is undefined in browser runtime.",
    });
  }

  // Example: ensure fetch exists
  if (typeof fetch !== "function") {
    issues.push({
      type: "config",
      message: "fetch API is not available in this environment.",
    });
  }

  // You can extend this with route map checks, feature flags, etc.

  const status: "healthy" | "warning" =
    issues.length === 0 ? "healthy" : "warning";

  return { status, issues };
}
