import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// -----------------------------
// Fetch all grants
// -----------------------------
export function useGrants() {
  return useQuery({
    queryKey: ["grants"],
    queryFn: async () => {
      const res = await fetch("/api/grants", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch grants");
      return res.json();
    },
  });
}

// -----------------------------
// Fetch a single grant
// -----------------------------
export function useGrant(id: string | number | null) {
  return useQuery({
    queryKey: ["grant", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/grants/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch grant ${id}`);
      return res.json();
    },
  });
}

// -----------------------------
// Create a new grant
// -----------------------------
export function useCreateGrant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/grants", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error("Failed to create grant");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grants"] });
    },
  });
}

// -----------------------------
// Update a grant
// -----------------------------
export function useUpdateGrant(id: string | number | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch(`/api/grants/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error(`Failed to update grant ${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grant", id] });
      qc.invalidateQueries({ queryKey: ["grants"] });
    },
  });
}

// -----------------------------
// Delete a grant
// -----------------------------
export function useDeleteGrant(id: string | number | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/grants/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to delete grant ${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grants"] });
      qc.removeQueries({ queryKey: ["grant", id] });
    },
  });
}
