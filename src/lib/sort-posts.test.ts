import { describe, expect, it } from 'vitest';
import { sortPosts } from './sort-posts';

const post = (id: string, sort_order: number, date: string) => ({ id, data: { sort_order, date } });

describe('sortPosts', () => {
  it('orders by sort order, then newest date, then id', () => {
    const posts = [
      post('10', 2, '2026-01-01'),
      post('3', 1, '2026-01-01'),
      post('2', 1, '2026-02-01'),
      post('1', 1, '2026-01-01'),
    ];
    expect(sortPosts(posts).map((p) => p.id)).toEqual(['2', '1', '3', '10']);
  });

  it('does not mutate its input', () => {
    const posts = [post('b', 2, '2026-01-01'), post('a', 1, '2026-01-01')];
    sortPosts(posts);
    expect(posts.map((p) => p.id)).toEqual(['b', 'a']);
  });
});
