import { ApiError } from '../utils/ApiError.js';

// Generic zod-schema validation middleware. Replaces req.body/query with
// the parsed (and therefore coerced + stripped-of-unknown-keys) result so
// downstream code can trust its shape.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(ApiError.badRequest('Validation failed', result.error.flatten().fieldErrors));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(ApiError.badRequest('Invalid query parameters', result.error.flatten().fieldErrors));
    }
    req.query = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(ApiError.badRequest('Invalid route parameters', result.error.flatten().fieldErrors));
    }
    req.params = result.data;
    next();
  };
}
