// UserMemory.js
export default {
  getUser: (userId, memory) => memory.UserMemory?.[userId] || null,
  setUser: (userId, data, memory) => { memory.UserMemory[userId] = data; },
};
