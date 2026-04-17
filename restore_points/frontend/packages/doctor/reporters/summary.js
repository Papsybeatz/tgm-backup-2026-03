/**
 * Minimal human-readable summary reporter.
 * The doctor engine will call this with the full results object.
 */
export function printHumanSummary(results) {
  console.log("=== Enterprise Doctor Summary ===");

  if (!results || typeof results !== "object") {
    console.log("No results available.");
    return;
  }

  // NEW: normalize structure
  const checks = Array.isArray(results.checks)
    ? results.checks
    : Array.isArray(results)
    ? results
    : [];

  const plugins = Array.isArray(results.plugins)
    ? results.plugins
    : [];

  console.log(`Checks run: ${checks.length}`);
  console.log(`Plugins loaded: ${plugins.length}`);

  for (const check of checks) {
    const name = check.name || "Unnamed check";
    const status = check.status || "unknown";
    const message = check.message || "";
    console.log(`- ${name}: ${status}${message ? ` — ${message}` : ""}`);
  }

  console.log("=================================");
}
