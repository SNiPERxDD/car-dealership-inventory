export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  token?: string;
  body?: unknown;
  onUnauthorized?: () => void;
}

/** Describes a failed API response without losing its HTTP status or public error code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Sends a typed JSON request and converts network and API errors into ApiError values. */
export async function apiRequest<ResponseBody>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ResponseBody> {
  const { token, body, onUnauthorized, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(path, {
      ...requestOptions,
      headers: requestHeaders,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection and try again.',
    );
  }

  if (response.status === 204) return undefined as ResponseBody;

  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.();
    const errorBody = isApiErrorBody(payload) ? payload.error : null;
    throw new ApiError(
      response.status,
      errorBody?.code ?? 'UNKNOWN_ERROR',
      errorBody?.message ?? 'The request could not be completed.',
    );
  }

  return payload as ResponseBody;
}

/** Narrows an untrusted JSON value to the API's documented error envelope. */
function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
