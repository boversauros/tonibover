import { describe, expect, it } from 'vitest';
import { formatPostNumber, postIdFromEntryId } from './format-post-number';

describe('formatPostNumber', () => {
  it('pads single digits to three characters', () => {
    expect(formatPostNumber(5)).toBe('005');
    expect(formatPostNumber(9)).toBe('009');
  });

  it('pads two-digit numbers to three characters', () => {
    expect(formatPostNumber(10)).toBe('010');
    expect(formatPostNumber(99)).toBe('099');
  });

  it('leaves three-digit and larger numbers unpadded', () => {
    expect(formatPostNumber(100)).toBe('100');
    expect(formatPostNumber(1321)).toBe('1321');
  });
});

describe('postIdFromEntryId', () => {
  it('parses the numeric id before the language suffix', () => {
    expect(postIdFromEntryId('99-ca')).toBe(99);
    expect(postIdFromEntryId('5-en')).toBe(5);
  });
});
