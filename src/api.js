const AUTH_API_PREFIX = 'http://localhost:8008/api/v1';
const CORE_API_PREFIX = 'http://localhost:8000/api/v1';
const CHAT_API_PREFIX = 'http://localhost:8010/api/v1';
const FILE_API_PREFIX = 'http://localhost:8020/api/v1';

function buildUrl(basePrefix, path, query) {
  const target = basePrefix.startsWith('http')
    ? `${basePrefix}${path}`
    : `${basePrefix}${path}`;
  const url = new URL(target, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  if (basePrefix.startsWith('http')) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    token,
    basePrefix = AUTH_API_PREFIX,
  } = options;

  const requestHeaders = { ...headers };
  const config = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(basePrefix, path, query), config);
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && (data.detail || data.message)) ||
      text ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export function authRequest(path, options = {}) {
  return apiRequest(path, { ...options, basePrefix: AUTH_API_PREFIX });
}

export function coreRequest(path, options = {}) {
  return apiRequest(path, { ...options, basePrefix: CORE_API_PREFIX });
}

export function chatRequest(path, options = {}) {
  return apiRequest(path, { ...options, basePrefix: CHAT_API_PREFIX });
}

export function fileRequest(path, options = {}) {
  return apiRequest(path, { ...options, basePrefix: FILE_API_PREFIX });
}
