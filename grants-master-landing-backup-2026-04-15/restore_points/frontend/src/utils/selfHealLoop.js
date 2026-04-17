import { logSelfHeal } from './selfHealLog';

/**
 * Attempts to auto-repair a component or file and logs the patch.
 * @param {Object} params
 * @param {string} params.componentName
 * @param {string} params.filePath
 * @param {string} params.issueDescription
 * @param {string} params.patchSummary
 * @param {Function} params.applyPatch - Function that applies the patch
 * @returns {boolean} true if patch applied, false otherwise
 */
export async function selfHealLoop({ componentName, filePath, issueDescription, patchSummary, applyPatch, systemStatus }) {
  try {
    const result = await applyPatch();
    logSelfHeal({
      componentName,
      filePath,
      timestamp: new Date().toISOString(),
      issueDescription,
      patchSummary,
      systemStatus: systemStatus || undefined
    });
    return !!result;
  } catch (err) {
    logSelfHeal({
      componentName,
      filePath,
      timestamp: new Date().toISOString(),
      issueDescription: issueDescription + ' (self-heal failed)',
      patchSummary: patchSummary + ' (error: ' + err.message + ')',
      systemStatus: systemStatus || undefined
    });
    return false;
  }
}
