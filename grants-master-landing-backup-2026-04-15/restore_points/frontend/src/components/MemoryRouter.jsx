// MemoryRouter.jsx
// Memory management for The Grants Master: grant data, user prefs, workflow outputs

const memoryStore = {
  GrantMemory: {},
  UserMemory: {},
  WorkflowMemory: {},
};

/**
 * Save a value to a memory type and key.
 * @param {string} type - Memory type (GrantMemory, UserMemory, WorkflowMemory)
 * @param {string} key
 * @param {*} value
 */
export function saveToMemory(type, key, value) {
  if (!memoryStore[type]) memoryStore[type] = {};
  memoryStore[type][key] = value;
}

/**
 * Get a value from a memory type and key.
 * @param {string} type
 * @param {string} key
 * @returns {*}
 */
export function getFromMemory(type, key) {
  return memoryStore[type]?.[key];
}

/**
 * Append a value to a memory type and key (array).
 * @param {string} type
 * @param {string} key
 * @param {*} value
 */
export function appendToMemory(type, key, value) {
  if (!memoryStore[type]) memoryStore[type] = {};
  if (!Array.isArray(memoryStore[type][key])) memoryStore[type][key] = [];
  memoryStore[type][key].push(value);
}
