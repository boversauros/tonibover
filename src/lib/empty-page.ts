import type { Page } from 'astro';

/** Build an empty paginated Page for when no posts exist. */
export function emptyPage<T>(current: string, size = 6): Page<T> {
  return {
    data: [],
    start: 0,
    end: -1,
    size,
    total: 0,
    currentPage: 1,
    lastPage: 1,
    url: { current, prev: undefined, next: undefined, first: undefined, last: undefined },
  };
}
