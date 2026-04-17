// ED/utils/safePath.js

import path from "path";

function extractString(input) {
  if (typeof input === "string") return input;

  if (input && typeof input.path === "string") return input.path;
  if (input && typeof input.file === "string") return input.file;
  if (input && typeof input.projectRoot === "string") return input.projectRoot;
  if (input && typeof input.backendPath === "string") return input.backendPath;

  return "";
}

export const safePath = {
  join(...args) {
    const clean = args.map(extractString);
    return path.join(...clean);
  },

  resolve(...args) {
    const clean = args.map(extractString);
    return path.resolve(...clean);
  },

  dirname(input) {
    return path.dirname(extractString(input));
  },

  basename(input) {
    return path.basename(extractString(input));
  },

  normalize(input) {
    return path.normalize(extractString(input));
  }
};
