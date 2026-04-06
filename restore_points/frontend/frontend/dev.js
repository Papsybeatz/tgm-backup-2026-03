import { runFrontendSystemCheck } from "./ed/systemCheck.js";
import { runFrontendAutoPatch } from "./ed/autoPatch.js";
import { runFrontendBuildIntegrity } from "./ed/buildIntegrity.js";
import { runFrontendDependencyIntegrity } from "./ed/dependencyIntegrity.js";
import { runFrontendRouteIntegrity } from "./ed/routeIntegrity.js";
import { startFrontendWatchdog } from "./ed/watchdog.js";

await runFrontendSystemCheck();
await runFrontendAutoPatch();
await runFrontendBuildIntegrity();
await runFrontendDependencyIntegrity();
await runFrontendRouteIntegrity();
await startFrontendWatchdog();
