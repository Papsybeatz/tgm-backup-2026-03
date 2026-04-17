type EnvShape = {
  VITE_API_URL: string;
  VITE_STRIPE_PUBLIC_KEY: string;
  NODE_ENV: "development" | "production" | "test";
};

type EnvStatus = "healthy" | "warning" | "failed";

export type EnvValidationResult = {
  status: EnvStatus;
  issues: string[];
  env: EnvShape;
};

const requiredKeys: (keyof EnvShape)[] = [
  "VITE_API_URL",
  "VITE_STRIPE_PUBLIC_KEY",
  "NODE_ENV",
];

export function validateEnv(): EnvValidationResult {
  const issues: string[] = [];

  const env: EnvShape = {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    NODE_ENV: import.meta.env.MODE as EnvShape["NODE_ENV"],
  };

  for (const key of requiredKeys) {
    const value = env[key];
    if (!value || typeof value !== "string" || value.trim() === "") {
      issues.push(`Missing or empty env var: ${key}`);
    }
  }

  let status: EnvStatus = "healthy";

  if (issues.length > 0) {
    status =
      env.NODE_ENV === "development"
        ? "warning" // allow boot in dev
        : "failed"; // block boot in prod
  }

  return { status, issues, env };
}
