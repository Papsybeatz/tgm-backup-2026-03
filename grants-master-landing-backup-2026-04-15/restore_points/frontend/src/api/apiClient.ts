const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function apiClient(path: string, options: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'include',
    });
  } catch (err) {
    console.error('Network error while fetching', path, err);
    throw new Error('Network error');
  }

  if (!res.ok) {
    let errorBody: any = null;
    try {
      errorBody = await res.json();
    } catch {}
    console.error('API returned non-OK status:', res.status, errorBody);
    throw new Error('Server error');
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    console.error('Invalid JSON from API:', err);
    throw new Error('Invalid server response');
  }

  return data;
}
