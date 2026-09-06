import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
}

// Centralized error handler. Normalizes ApiError, Mongoose validation/cast
// errors and duplicate-key errors into a consistent shape, and NEVER leaks
// stack traces or raw DB errors to the client.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let apiError = err;

  if (!err.isApiError) {
    if (err.name === 'ValidationError') {
      apiError = ApiError.badRequest('Validation failed', formatMongooseValidation(err));
    } else if (err.name === 'CastError') {
      apiError = ApiError.badRequest(`Invalid value for field "${err.path}"`);
    } else if (err.code === 11000) {
      apiError = ApiError.conflict('A record with these details already exists', extractDupeKey(err));
    } else {
      apiError = ApiError.internal();
      // eslint-disable-next-line no-console
      console.error('[unhandled error]', err);
    }
  }

  const body = {
    error: {
      message: apiError.message,
      code: apiError.code,
      ...(apiError.details ? { details: apiError.details } : {}),
    },
  };

  if (!env.isProd && !apiError.isApiError) {
    body.error.stack = err.stack;
  }

  res.status(apiError.statusCode || 500).json(body);
}

function formatMongooseValidation(err) {
  return Object.fromEntries(Object.entries(err.errors || {}).map(([k, v]) => [k, v.message]));
}

function extractDupeKey(err) {
  return err.keyValue || {};
}
