const AUTH_API_PREFIX = 'http://localhost:8008/api/v1';
const CORE_API_PREFIX = 'http://localhost:8000/api/v1';
const CHAT_API_PREFIX = 'http://localhost:8010/api/v1';
const FILE_API_PREFIX = 'http://localhost:8020/api/v1';
const CHAT_WS_PREFIX = 'ws://localhost:8010';

let authFailureHandler = null;

function buildUrl(basePrefix, path, query) {
  const url = new URL(`${basePrefix}${path}`, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return basePrefix.startsWith('http') ? url.toString() : `${url.pathname}${url.search}`;
}

function notifyAuthFailure(error) {
  if (typeof authFailureHandler === 'function') {
    authFailureHandler(error);
  }
}

export function registerAuthFailureHandler(handler) {
  authFailureHandler = handler;

  return () => {
    if (authFailureHandler === handler) {
      authFailureHandler = null;
    }
  };
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

  let response;

  try {
    response = await fetch(buildUrl(basePrefix, path, query), config);
  } catch (error) {
    throw new Error(error?.message || 'Network request failed.');
  }

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

    const error = new Error(message);
    error.status = response.status;

    if (response.status === 401 || response.status === 403) {
      notifyAuthFailure(error);
    }

    throw error;
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

export function chatWebSocketUrl(path, token) {
  const url = new URL(`${CHAT_WS_PREFIX}${path}`);

  if (token) {
    url.searchParams.set('token', token);
  }

  return url.toString();
}
