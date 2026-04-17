

import backendIntegrityCore from "../../ED/modules/backend-integrity-core.js";
import authBoundaryIntegrity from "../../ED/modules/auth-boundary-integrity.js";
import backendBootIntegrity from "../../ED/modules/backendBootIntegrity.js";
import supportDomainIntegrity from "../../ED/modules/support-domain-integrity.js";
import staleFrontendBuildIntegrity from "../../ED/modules/stale-frontend-build-integrity.js";
import { prismaEnvCheck } from "../../ed/modules/prismaEnvCheck.js";

export const registry = [
  backendIntegrityCore,
  authBoundaryIntegrity,
  backendBootIntegrity,
  supportDomainIntegrity,
  staleFrontendBuildIntegrity,
  prismaEnvCheck,
];
