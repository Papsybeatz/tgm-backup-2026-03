// ED/utils/normalizeContext.js

import { normalizeProjectRoot, normalizeBackendPath } from "./normalizePaths.js";
import { sanitizeBrowserTabs } from "./sanitizeBrowserTabs.js";

export function normalizeContext(context) {
  if (!context || typeof context !== "object") return {};

  const projectRoot = normalizeProjectRoot(context);
  const backendPath = normalizeBackendPath(context, projectRoot);

  return {
    ...context,
    projectRoot,
    config: {
      ...(context.config || {}),
      backendPath,
    },
    browserTabs: sanitizeBrowserTabs(context.browserTabs),
  };
}
