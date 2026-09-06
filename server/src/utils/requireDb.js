import { isDbReady } from '../config/db.js';
import { ApiError } from './ApiError.js';

// Guard placed on every DB-backed route so the API degrades gracefully
// (clear 503) instead of hanging when MongoDB is not yet reachable.
export function requireDb(req, res, next) {
  if (!isDbReady()) {
    return next(
      ApiError.serviceUnavailable(
        'Database is not connected. Check MONGODB_URI and that MongoDB is reachable.'
      )
    );
  }
  next();
}
