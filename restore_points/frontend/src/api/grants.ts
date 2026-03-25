import { apiClient } from "./apiClient";

export async function createGrant(title: string) {
  if (!title || title.trim().length === 0) {
    throw new Error("Grant title is required");
  }

  const payload = { title };

  const grant = await apiClient("/api/grants", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return grant; // { id, title, createdAt, ... }
}