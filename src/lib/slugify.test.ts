import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases ASCII input', () => {
    expect(slugify('Hello')).toBe('hello');
  });

  it('strips Catalan diacritics', () => {
    expect(slugify('Vivència')).toBe('vivencia');
    expect(slugify('reflexió')).toBe('reflexio');
    expect(slugify('Mediterrània')).toBe('mediterrania');
  });

  it('collapses diacritic variants to one slug', () => {
    expect(slugify('Vivència')).toBe(slugify('vivencia'));
  });

  it('replaces whitespace runs with single dash', () => {
    expect(slugify('hello   world')).toBe('hello-world');
    expect(slugify('a\tb\nc')).toBe('a-b-c');
  });

  it('replaces punctuation with dash', () => {
    expect(slugify('hello, world!')).toBe('hello-world');
    expect(slugify('foo/bar.baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  hello  ')).toBe('hello');
    expect(slugify('---hello---')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('returns empty string when all chars are stripped', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});
