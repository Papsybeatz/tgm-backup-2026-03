// WorkflowMemory.js
export default {
  getPreviousOutput: (memory) => memory.WorkflowMemory?.previousOutput || null,
  setPreviousOutput: (output, memory) => { memory.WorkflowMemory.previousOutput = output; },
};
