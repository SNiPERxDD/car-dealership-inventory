import type { ErrorRequestHandler, RequestHandler } from 'express';

/** An error that maps directly to an HTTP status and a stable machine-readable code. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Responds 404 for any API route that no router handled. */
export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: { code: 'NOT_FOUND', message: `No route for ${request.method} ${request.path}` },
  });
};

/**
 * Converts thrown errors into the `{ error: { code, message } }` shape.
 * Unexpected errors are logged server-side and never leak stack traces or SQL to clients.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (isBodyParserError(error)) {
    const status = error.status;
    const code =
      error.type === 'entity.parse.failed'
        ? 'INVALID_JSON'
        : status === 413
          ? 'PAYLOAD_TOO_LARGE'
          : status === 415
            ? 'UNSUPPORTED_MEDIA_TYPE'
            : 'BAD_REQUEST';
    const message =
      error.type === 'entity.parse.failed'
        ? 'Request body is not valid JSON'
        : 'Invalid request body';
    response.status(status).json({ error: { code, message } });
    return;
  }
  console.error(error);
  response
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
};

/** Recognizes body-parser errors carrying a client-error status. */
function isBodyParserError(error: unknown): error is { status: number; type: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'type' in error &&
    typeof error.type === 'string'
  );
}
