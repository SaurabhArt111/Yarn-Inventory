import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';

async function main() {
  // Start connecting to MongoDB in the background, but do not block the
  // HTTP server on it -- DB-dependent routes guard themselves with
  // requireDb() and return a clean 503 until the connection is ready.
  connectDb();

  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Yarn ERP API listening on port ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
