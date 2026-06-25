export function sortKeywords(keywords: readonly string[], locale = 'en'): string[] {
  return [...keywords].sort((a, b) => a.localeCompare(b, locale, { sensitivity: 'base' }));
}
