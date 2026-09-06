// Wraps async route handlers so rejected promises reach the centralized
// error handler instead of crashing the process or hanging the request.
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
