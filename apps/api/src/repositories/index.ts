import { env } from '../config/env.js';
import { createJsonRepositories } from './json/repositories.js';
import type { RepositoryBundle } from './types.js';

/**
 * Repository registry.
 *
 * This function is the single seam between the API and its storage. To move
 * the portal onto a real database, add a `createPostgresRepositories()` that
 * satisfies `RepositoryBundle`, register it in the switch below, and set
 * `DATA_DRIVER=postgres`. Nothing above this file needs to change.
 */
function createRepositories(): RepositoryBundle {
  switch (env.DATA_DRIVER) {
    case 'json':
      return createJsonRepositories();
    default: {
      // Exhaustiveness guard: adding a driver to the env enum without
      // registering it here becomes a compile error rather than a runtime one.
      const exhaustive: never = env.DATA_DRIVER;
      throw new Error(`Unsupported DATA_DRIVER: ${String(exhaustive)}`);
    }
  }
}

export const repositories: RepositoryBundle = createRepositories();

export type { RepositoryBundle } from './types.js';
