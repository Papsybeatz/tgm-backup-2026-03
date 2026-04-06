// packages/doctor/pipeline.js




import path from "path";
import { registry } from "./registry.js";
import { prismaEnvironmentDoctor } from "../../../ed/modules/prismaEnvironmentDoctor.js";
import { prismaEnvironmentAutoFix } from "../../../ed/modules/prismaEnvironmentAutoFix.js";
import { prismaSchemaDoctor } from "../../../ed/modules/prismaSchemaDoctor.js";
import { prismaMigrationSafety } from "../../../ed/modules/prismaMigrationSafety.js";
export async function runMigrationSafety() {
  const schema = prismaSchemaDoctor();
  const migration = prismaMigrationSafety();

  const issues = [...schema.issues, ...migration.issues];

  if (issues.length === 0) {
    return {
      status: "ok",
      message: "Schema and migration are safe.",
    };
  }

  return {
    status: "warning",
    issues,
    message: "Potentially unsafe migration detected. Review required.",
  };
}
export async function runSchemaDoctor() {
  const { issues } = prismaSchemaDoctor();
  if (issues.length === 0) {
    return { status: "ok", message: "Prisma schema structure is healthy." };
  }
  return {
    status: "warning",
    issues,
    message: "Schema issues detected. Manual review recommended.",
  };
}

// Always resolve roots using config
function getRoots(config = {}) {
  const projectRoot = path.resolve(process.cwd());
  const frontendRoot = path.resolve(projectRoot, config.frontendPath || "./");
  const backendRoot = path.resolve(projectRoot, config.backendPath || "./backend");
  return { projectRoot, frontendRoot, backendRoot };
}

// Global path normalizer for ED context
function normalizePaths(context) {
  const path = globalThis.ED_SAFE_PATH;
  function safe(p) {
    if (!p) return "";
    if (typeof p === "string") return p;
    if (typeof p === "object" && p.root) return p.root;
    return "";
  }
  // Always resolve backendRoot as projectRoot + '/backend'
  const resolvedProjectRoot = safe(context.projectRoot);
  const resolvedBackendRoot = path.resolve(resolvedProjectRoot, "backend");
  return {
    ...context,
    projectRoot: resolvedProjectRoot,
    backendRoot: resolvedBackendRoot,
    frontendRoot: safe(context.frontendRoot),
    paths: {
      ...context.paths,
      projectRoot: resolvedProjectRoot,
      backendRoot: resolvedBackendRoot,
      frontendRoot: safe(context.paths?.frontendRoot),
    }
  };
}

  const { projectRoot: pr, frontendRoot, backendRoot } = getRoots(config);
  const DETAILED = true;
  const results = [];
  for (const mod of registry) {
    try {
      const context = {
        projectRoot: pr,
        frontendRoot,
        backendRoot,
        paths: {
          projectRoot: pr,
          frontendRoot,
          backendRoot,
        },
        config,
        backendPath: config.backendPath || 'backend',
      };
      const safeContext = normalizePaths(context);
      let scanResults;
      try {
        scanResults = await mod.scan(safeContext, { detailed: DETAILED });
      } catch (err) {
        console.warn(`[ED] Module ${mod.id || mod.name} crashed:`, err.message);
        throw err;
      }
      results.push({
        module: mod.name,
        description: mod.description,
        severity: mod.severity,
        issues: scanResults
      });
    } catch (err) {
      results.push({
        module: mod.name,
        description: mod.description,
        severity: "error",
        issues: [
          {
            type: "error",
            message: "Scanner crashed",
            details: err.message
          }
        ]
      });
    }
  }
  return results;
}

export async function runDoctorFix(projectRoot, config = globalThis.ED_CONFIG || {}) {
  const { projectRoot: pr, frontendRoot, backendRoot } = getRoots(config);
  const actions = [];
  for (const mod of registry) {
    try {
      const context = {
        projectRoot: pr,
        frontendRoot,
        backendRoot,
        paths: {
          projectRoot: pr,
          frontendRoot,
          backendRoot,
        },
        config,
        backendPath: config.backendPath || 'backend',
      };
      const safeContext = normalizePaths(context);
      let fixActions;
      try {
        fixActions = await mod.fix([], safeContext); // Pass empty issues for now, real issues should be passed if available
      } catch (err) {
        console.warn(`[ED] Module ${mod.id || mod.name} crashed (fix):`, err.message);
        throw err;
      }
      actions.push({
        module: mod.name,
        description: mod.description,
        severity: mod.severity,
        actions: fixActions
      });
    } catch (err) {
      actions.push({
        module: mod.name,
        description: mod.description,
        severity: "error",
        actions: [
          {
            type: "error",
            message: "Fixer crashed",
            details: err.message
          }
        ]
      });
    }
  }
  return actions;
}

  // Run Prisma Environment Doctor before main sweep
  const pedResult = prismaEnvironmentDoctor();
  if (pedResult.issues && pedResult.issues.length > 0) {
    prismaEnvironmentAutoFix(pedResult.issues);
  }
  const scanBefore = await runDoctorScan(projectRoot, config);
  const fixes = await runDoctorFix(projectRoot, config);
  const scanAfter = await runDoctorScan(projectRoot, config);
  return {
    ped: pedResult,
    before: scanBefore,
    fixes,
    after: scanAfter
  };
}
