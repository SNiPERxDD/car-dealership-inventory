import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ZodType } from 'zod';
import { HttpError } from './errors.js';

/** Validates and replaces the request body with the schema's parsed value. */
export function validateBody<Schema extends ZodType>(
  schema: Schema,
): RequestHandler<ParamsDictionary, unknown, unknown> {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(
        new HttpError(
          400,
          'VALIDATION_ERROR',
          result.error.issues[0]?.message ?? 'Invalid request body',
        ),
      );
      return;
    }
    request.body = result.data;
    next();
  };
}
