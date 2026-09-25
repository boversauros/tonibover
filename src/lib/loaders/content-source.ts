export type ContentSource = 'supabase' | 'aws';

/** Explicit migration switch. AWS selection never silently falls back to Supabase. */
export function resolveContentSource(
  env: Record<string, unknown> = { ...import.meta.env, ...process.env }
): ContentSource {
  const source = env.CONTENT_SOURCE ?? 'supabase';
  if (source === 'supabase' || source === 'aws') return source;
  throw new Error('CONTENT_SOURCE must be supabase or aws');
}
