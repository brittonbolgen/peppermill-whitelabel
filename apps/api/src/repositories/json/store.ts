import { buildDataset, type Dataset } from '../../data/seed.js';

/**
 * The in-memory dataset.
 *
 * Generated once at module load and mutated in place by the JSON repositories,
 * so writes made during a demo session persist until the process restarts.
 * That is deliberate: a reviewer can resolve an alert, submit a representment
 * and see both reflected in the dashboard totals.
 */
let dataset: Dataset = buildDataset();

export function getDataset(): Dataset {
  return dataset;
}

/** Restores the generated fixtures — used by tests and the demo reset endpoint. */
export function resetDataset(now = new Date()): Dataset {
  dataset = buildDataset(now);
  return dataset;
}
