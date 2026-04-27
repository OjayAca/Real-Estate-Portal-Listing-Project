function resolveDefaultApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000/api';
  }

  const { hostname, protocol } = window.location;
  const resolvedProtocol = protocol === 'https:' ? 'https:' : 'http:';
  const resolvedHost = hostname || '127.0.0.1';

  return `${resolvedProtocol}//${resolvedHost}:8000/api`;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || resolveDefaultApiBaseUrl()).replace(/\/+$/, '');
const SANCTUM_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
let csrfCookiePromise = null;

function readCookie(name) {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? cookie.slice(name.length + 1) : null;
}

async function ensureCsrfCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  if (readCookie(CSRF_COOKIE_NAME)) {
    return;
  }

  if (!csrfCookiePromise) {
    csrfCookiePromise = fetch(`${SANCTUM_BASE_URL}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }).then((response) => {
      if (!response.ok) {
        const error = new Error('Unable to initialize the CSRF cookie.');
        error.status = response.status;
        throw error;
      }
    }).finally(() => {
      csrfCookiePromise = null;
    });
  }

  await csrfCookiePromise;
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', token, body, signal } = options;
  const isFormData = body instanceof FormData;
  const upperMethod = method.toUpperCase();
  const requiresCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(upperMethod) && path !== '/sanctum/csrf-cookie';

  if (requiresCsrf) {
    await ensureCsrfCookie();
  }

  const csrfToken = readCookie(CSRF_COOKIE_NAME);

  let response;

  try {
    response = await fetch(path === '/sanctum/csrf-cookie' ? `${SANCTUM_BASE_URL}${path}` : `${API_BASE_URL}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(csrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (networkError) {
    const error = new Error(networkError.message || 'Network request failed.');
    error.status = 0;
    error.details = null;
    error.cause = networkError;
    throw error;
  }

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok) {
        const error = new Error('Unexpected non-JSON response from the server.');
        error.status = response.status;
        error.details = null;
        error.raw = text;
        throw error;
      }

      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data.message || response.statusText || 'Request failed.');
    error.status = response.status;
    error.details = data.errors || null;
    error.data = data;
    throw error;
  }

  return data;
}

export { API_BASE_URL };
