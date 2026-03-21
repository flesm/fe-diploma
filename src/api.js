const API_PREFIX = '/api/v1';

function buildUrl(path, query) {
  const url = new URL(`${API_PREFIX}${path}`, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return `${url.pathname}${url.search}`;
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
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

  const response = await fetch(buildUrl(path, query), config);
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
