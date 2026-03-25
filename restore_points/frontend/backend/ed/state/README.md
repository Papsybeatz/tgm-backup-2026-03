# ED State Directory

This directory stores all persistent state, logs, and configuration for ED v3.

## Files

### `config.json`
Controls ED's operating mode:
- `"auto"` — ED repairs issues automatically and restarts backend.
- `"ask"` — ED pauses and waits for user confirmation before applying fixes.

### `repairHistory.json`
Machine-readable log of all repairs ED has performed.

### `repairHistory.log`
Human-readable log of all repairs, timestamps, and actions.

### `bootIntegrity.log`
Logs results of ED boot integrity checks.

## Directories

### `diagnosticSnapshots/`
Stores snapshots of ED diagnostics over time for debugging and audit trails.

---

ED v3 is designed to run your backend on autopilot, detect drift, repair issues, and maintain stability without manual intervention.
