import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { validateEnv } from "./guardian/envSchema";
import { checkRuntimeIntegrity } from "./guardian/runtimeIntegrity";
import { GlobalErrorBoundary } from "./guardian/GlobalErrorBoundary";

const envResult = validateEnv();
if (envResult.status === "failed") {
  console.error("[FrontendGuardian] Env validation failed:", envResult.issues);
  document.getElementById("root").innerHTML = `
    <div style="padding:2rem;font-family:system-ui">
      <h1>Frontend configuration error</h1>
      <p>The application cannot start because required environment variables are missing.</p>
      <pre>${envResult.issues.join("\n")}</pre>
    </div>
  `;
} else {
  if (envResult.status === "warning") {
    console.warn("[FrontendGuardian] Env warnings:", envResult.issues);
  } else {
    console.log("[FrontendGuardian] Env healthy.");
  }

  const runtimeResult = checkRuntimeIntegrity();
  if (runtimeResult.status === "warning") {
    console.warn("[FrontendGuardian] Runtime integrity warnings:", runtimeResult.issues);
  } else {
    console.log("[FrontendGuardian] Runtime integrity healthy.");
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </React.StrictMode>
  );
}
