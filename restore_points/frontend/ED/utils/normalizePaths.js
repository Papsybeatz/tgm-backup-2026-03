// ED/utils/normalizePaths.js

import path from "path";

export function normalizeProjectRoot(context) {
  const pr = context?.projectRoot;

  if (typeof pr === "string") return pr;

  if (pr && typeof pr.projectRoot === "string") {
    return pr.projectRoot;
  }

  if (typeof context === "string") return context;

  return process.cwd();
}

export function normalizeBackendPath(context, projectRoot) {
  const cfg = context?.config || {};
  const bp = cfg.backendPath;

  if (typeof bp === "string") {
    return path.resolve(projectRoot, bp);
  }

  if (bp && typeof bp.backendPath === "string") {
    return path.resolve(projectRoot, bp.backendPath);
  }

  return null;
}

export function normalizeAnyPath(input, projectRoot) {
  if (typeof input === "string") return input;
  if (input && typeof input.path === "string") return input.path;
  if (input && typeof input.file === "string") return input.file;
  if (projectRoot && typeof projectRoot === "string") return projectRoot;
  return null;
}
