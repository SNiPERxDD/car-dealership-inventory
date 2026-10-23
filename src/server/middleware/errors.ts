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
  if (isBodyParseError(error)) {
    response
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
    return;
  }
  console.error(error);
  response
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
};

function isBodyParseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}
