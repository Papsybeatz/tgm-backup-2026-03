import { useQuery } from '@tanstack/react-query';

async function fetchTestAI() {
  const res = await fetch('/api/test-ai');
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

// Accept options so callers can opt-in to fetching (e.g., enabled: false)
export default function useTestAI(options = { enabled: false }) {
  return useQuery({
    queryKey: ['test-ai'],
    queryFn: fetchTestAI,
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
    enabled: options.enabled || false,
  });
}
