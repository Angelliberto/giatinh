const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'giatinh_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

type ApiOptions = RequestInit & { json?: unknown };

const WAKE_DELAYS = [2000, 4000, 8000, 12000, 16000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWakeFailure(error: unknown) {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return error instanceof Error && /Request failed \((502|503|504)\)/.test(error.message);
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, headers: initHeaders, signal, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';
  const attempts = canRetry ? WAKE_DELAYS.length + 1 : 1;
  let lastError: Error = new Error('Request failed');

  for (let attempt = 0; attempt < attempts; attempt++) {
    const timeout = AbortSignal.timeout(20000);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const headers = new Headers(initHeaders);
      if (json !== undefined) headers.set('Content-Type', 'application/json');
      const token = getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const res = await fetch(`${API_URL}${path}`, {
        ...rest,
        method,
        headers,
        credentials: 'include',
        signal: requestSignal,
        body: json !== undefined ? JSON.stringify(json) : rest.body,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error((data as { error?: string }).error || `Request failed (${res.status})`);
        const waking = canRetry && [502, 503, 504].includes(res.status) && attempt < attempts - 1;
        if (!waking) throw error;
        lastError = error;
      } else {
        return data as T;
      }
    } catch (error) {
      if (signal?.aborted) throw error instanceof Error ? error : lastError;
      const retryable = canRetry && attempt < attempts - 1 && isWakeFailure(error);
      if (!retryable) throw error instanceof Error ? error : lastError;
      lastError = error instanceof Error ? error : lastError;
    }
    await sleep(WAKE_DELAYS[attempt]);
  }

  throw lastError;
}

export async function apiUpload<T>(
  path: string,
  file: File,
  fields: Record<string, string> = {}
): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));

  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`);
  }
  return data as T;
}

export { API_URL };
