import type { Paginated, PaginationQuery } from '@peppermill/shared';

/**
 * In-memory sorting, filtering and slicing.
 *
 * The JSON repositories do their querying in process. Keeping that logic here
 * rather than inside each repository means a future SQL-backed repository can
 * push the same semantics down to the database without any caller changing.
 */

export type SortDirection = 'asc' | 'desc';

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);

  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

/** Reads `a.b.c` style paths so callers can sort on nested money amounts. */
function resolvePath(item: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, item);
}

export function sortItems<T>(items: T[], sort: string | undefined, order: SortDirection): T[] {
  if (!sort) return items;
  const factor = order === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => compare(resolvePath(a, sort), resolvePath(b, sort)) * factor);
}

/** Case-insensitive substring match across the supplied field paths. */
export function searchItems<T>(items: T[], term: string | undefined, fields: string[]): T[] {
  if (!term) return items;
  const needle = term.toLowerCase();
  return items.filter((item) =>
    fields.some((field) => {
      const value = resolvePath(item, field);
      return value != null && String(value).toLowerCase().includes(needle);
    }),
  );
}

export function paginate<T>(items: T[], query: Pick<PaginationQuery, 'page' | 'pageSize'>): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  // Clamping keeps an out-of-range `page` from returning an empty payload that
  // the client would render as "no results" rather than "past the last page".
  const page = Math.min(Math.max(1, query.page), totalPages);
  const start = (page - 1) * query.pageSize;

  return {
    data: items.slice(start, start + query.pageSize),
    meta: { page, pageSize: query.pageSize, total, totalPages },
  };
}
