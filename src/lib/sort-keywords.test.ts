import { describe, expect, it } from 'vitest';
import { sortKeywords } from './sort-keywords';

describe('sortKeywords', () => {
  it('sorts alphabetically case-insensitively', () => {
    expect(
      sortKeywords(['Decisive moment', 'Abstract aesthetic', 'Concept', 'Advertising image'])
    ).toEqual(['Abstract aesthetic', 'Advertising image', 'Concept', 'Decisive moment']);
  });

  it('does not mutate the input array', () => {
    const input = ['b', 'a'];
    sortKeywords(input);
    expect(input).toEqual(['b', 'a']);
  });
});
