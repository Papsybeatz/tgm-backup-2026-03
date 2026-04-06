// MemoryRouter.js
const memoryStore = {
  GrantMemory: {},
  UserMemory: {},
  WorkflowMemory: {},
};
export function saveToMemory(type, key, value) {
  if (!memoryStore[type]) memoryStore[type] = {};
  memoryStore[type][key] = value;
}
export function getFromMemory(type, key) {
  return memoryStore[type]?.[key];
}
export function appendToMemory(type, key, value) {
  if (!memoryStore[type]) memoryStore[type] = {};
  if (!Array.isArray(memoryStore[type][key])) memoryStore[type][key] = [];
  memoryStore[type][key].push(value);
}
export function clearMemory(type) {
  memoryStore[type] = {};
}
export function handleAgentOutput(agent, output, userId = "default") {
  switch (agent) {
    case "PlannerAgent":
      saveToMemory("GrantMemory", `${userId}_plan`, output);
      saveToMemory("WorkflowMemory", "previousOutput", output);
      break;
    case "DraftAgent":
      saveToMemory("GrantMemory", `${userId}_draft`, output);
      saveToMemory("WorkflowMemory", "previousOutput", output);
      break;
    case "ValidatorAgent":
      appendToMemory("GrantMemory", `${userId}_validationNotes`, output);
      saveToMemory("WorkflowMemory", "previousOutput", output);
      break;
    case "PolisherAgent":
      saveToMemory("GrantMemory", `${userId}_draft`, output);
      saveToMemory("WorkflowMemory", "previousOutput", output);
      break;
    case "PricingAgent":
    case "TeamAgent":
      saveToMemory("UserMemory", userId, output);
      break;
    default:
      saveToMemory("WorkflowMemory", "previousOutput", output);
  }
}
