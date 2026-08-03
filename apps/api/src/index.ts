import { createApp } from './app.js';
import { env } from './config/env.js';
import { getDataset } from './repositories/json/store.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  const dataset = getDataset();

  console.log('');
  console.log('  PepperMill Portal API');
  console.log(`  http://localhost:${env.PORT}/api/v1`);
  console.log('');
  console.log(`  environment  ${env.NODE_ENV}`);
  console.log(`  data driver  ${env.DATA_DRIVER}`);
  console.log(
    `  seeded       ${dataset.tenants.length} tenants · ${dataset.cases.length} cases · ` +
      `${dataset.alerts.length} alerts · ${dataset.users.length} users`,
  );
  console.log('');
});

/**
 * Graceful shutdown.
 *
 * Stops accepting new connections and lets in-flight requests finish, with a
 * hard deadline so a stuck socket cannot block a redeploy indefinitely.
 */
function shutdown(signal: string): void {
  console.log(`\n${signal} received, shutting down.`);

  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out; exiting.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close((error) => {
    if (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
