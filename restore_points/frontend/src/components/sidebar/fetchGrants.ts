interface ImportMetaEnv {
  VITE_API_URL?: string;
}
declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000';

export async function fetchGrants() {
  let res: Response;

  try {
    res = await fetch(`${API_URL}/api/grants`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
  } catch (err) {
    console.error('Network error while fetching grants:', err);
    throw new Error('Network error');
  }

  if (!res.ok) {
    let errorBody: any = null;
    try {
      errorBody = await res.json();
    } catch {
      // ignore
    }
    console.error('Grants API returned non-OK status:', res.status, errorBody);
    throw new Error('Server error');
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    console.error('Invalid JSON from grants API:', err);
    throw new Error('Invalid server response');
  }

  if (!Array.isArray(data)) {
    console.error('Grants API returned non-array payload:', data);
    throw new Error('Invalid server response');
  }

  return data;
}
