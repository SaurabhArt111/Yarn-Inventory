// Central error type. Controllers/services throw these; the error handler
// middleware knows how to translate them into a consistent JSON shape and
// never leaks stack traces or internal DB errors to the client.
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined, code = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code || defaultCodeForStatus(statusCode);
    this.isApiError = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details, 'BAD_REQUEST');
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, undefined, 'UNAUTHORIZED');
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message, undefined, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, undefined, 'NOT_FOUND');
  }

  static conflict(message, details) {
    return new ApiError(409, message, details, 'CONFLICT');
  }

  static insufficientInventory(message, details) {
    return new ApiError(409, message, details, 'INSUFFICIENT_INVENTORY');
  }

  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new ApiError(503, message, undefined, 'SERVICE_UNAVAILABLE');
  }

  static internal(message = 'Something went wrong') {
    return new ApiError(500, message, undefined, 'INTERNAL_ERROR');
  }
}

function defaultCodeForStatus(status) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] || 'INTERNAL_ERROR';
}
