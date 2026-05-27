// Tiny authenticated-fetch wrapper. Keeps token+base URL in one place so the
// rest of the app stops repeating the same boilerplate.
export const API_BASE = 'http://localhost:3001/api/v1';

export function getAuth() {
  if (typeof window === 'undefined') return { token: null, userId: null, role: null };
  return {
    token: localStorage.getItem('fitflow_token'),
    userId: localStorage.getItem('fitflow_userId'),
    role: localStorage.getItem('fitflow_role'),
  };
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token: tokenOverride, headers, ...rest } = options;
  const token = tokenOverride ?? getAuth().token;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as any;
  return res.json() as Promise<T>;
}
