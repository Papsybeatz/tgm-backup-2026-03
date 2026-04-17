// ValidatorAgent.js
export default {
  name: "ValidatorAgent",
  description: "Checks clarity, alignment, funder fit, and missing elements.",
  capabilities: ["validation", "review"],
  handler: async (input, memory) => {
    // Simulate validation
    return {
      output: {
        isValid: true,
        feedback: []
      },
      metadata: { step: "validation" },
      updatedMemory: memory
    };
  }
};
