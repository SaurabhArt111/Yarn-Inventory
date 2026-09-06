import mongoose from 'mongoose';
import { env } from './env.js';

// The app must still boot and answer health checks even if MongoDB is
// unreachable (e.g. first-run before a database is provisioned). Every
// DB-dependent route checks `isDbReady()` and returns a clear 503 instead
// of hanging or crashing the process.
let ready = false;
let lastError = null;

export function isDbReady() {
  return ready && mongoose.connection.readyState === 1;
}

export function getDbStatus() {
  return {
    ready: isDbReady(),
    readyState: mongoose.connection.readyState,
    lastError: lastError ? String(lastError.message || lastError) : null,
  };
}

export async function connectDb() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    ready = true;
    lastError = null;
    // eslint-disable-next-line no-console
    console.log('[db] MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    ready = false;
    // eslint-disable-next-line no-console
    console.warn('[db] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    ready = false;
    lastError = err;
    // eslint-disable-next-line no-console
    console.error('[db] MongoDB connection error:', err.message);
  });

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 4000,
    });
  } catch (err) {
    ready = false;
    lastError = err;
    // eslint-disable-next-line no-console
    console.error(
      `[db] Initial connection failed: ${err.message}. ` +
        'The API will keep running and retry in the background; ' +
        'DB-dependent routes will respond with 503 until a database is reachable.'
    );
    // Retry loop in the background instead of crashing the process.
    scheduleRetry();
  }
}

function scheduleRetry() {
  setTimeout(async () => {
    if (isDbReady()) return;
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 4000 });
    } catch (err) {
      lastError = err;
      scheduleRetry();
    }
  }, 5000);
}
