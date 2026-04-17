export function envDiagnostics(requiredKeys) {
  const issues = [];

  for (const key of requiredKeys) {
    if (!process.env[key] || process.env[key].trim() === "") {
      issues.push(`Missing or empty env var: ${key}`);
    }
  }

  return issues;
}
