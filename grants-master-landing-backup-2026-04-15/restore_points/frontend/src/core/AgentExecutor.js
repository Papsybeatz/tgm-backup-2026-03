// AgentExecutor.js
import { getAgent } from './AgentRegistry.js';

/**
 * Executes an agent by name with input and memory.
 * @param {string} agentName
 * @param {*} input
 * @param {*} memory
 * @returns {Promise<{ output, metadata, updatedMemory }>}
 */
export async function executeAgent(agentName, input, memory) {
  const agent = getAgent(agentName);
  if (!agent) throw new Error(`Agent not found: ${agentName}`);
  const result = await agent.handler(input, memory);
  return result;
}
