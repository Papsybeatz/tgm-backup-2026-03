// TeamAgent.js
export default {
  name: "TeamAgent",
  description: "Handles seat management, invites, and team settings.",
  capabilities: ["team management", "seats", "invites"],
  handler: async (input, memory) => {
    // Simulate team logic
    return {
      output: `Team info for: ${input}`,
      metadata: { step: "team" },
      updatedMemory: memory
    };
  }
};
