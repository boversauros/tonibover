import { describe, expect, it } from 'vitest';
import { resolveContentSource } from './content-source';

describe('content source during migration', () => {
  it('keeps the existing source until AWS is explicitly selected', () => {
    expect(resolveContentSource({})).toBe('supabase');
    expect(resolveContentSource({ CONTENT_SOURCE: 'supabase' })).toBe('supabase');
    expect(resolveContentSource({ CONTENT_SOURCE: 'aws' })).toBe('aws');
  });

  it('rejects a misspelled or empty switch value', () => {
    expect(() => resolveContentSource({ CONTENT_SOURCE: '' })).toThrow(/CONTENT_SOURCE/);
    expect(() => resolveContentSource({ CONTENT_SOURCE: 'AWS' })).toThrow(/CONTENT_SOURCE/);
  });
});
