const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export async function apiRequest(path, options = {}) {
  const { method = 'GET', token, body, signal } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    error.details = data.errors || null;
    throw error;
  }

  return data;
}

export { API_BASE_URL };
