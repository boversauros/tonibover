/**
 * Page-level parity for the AWS-backed collections (tonibover #14).
 *
 * Each build runs `astro build` in a child process from a fixture snapshot,
 * through the real snapshot validation and adapter. Run with `pnpm test:site`.
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Catalog, PublishedPost } from '../../src/lib/aws-reader/contract';
import type { SiteFixture } from './fixture-reader';

const run = promisify(execFile);
const builder = fileURLToPath(new URL('./build.mjs', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'tonibover-site-build-'));
const SENTINEL = 'FIXTURE-SENTINEL';

const catalog: Catalog = {
  categories: [
    { id: '1', slug: 'vivencies', names: { ca: 'Vivències', en: 'Experiences' } },
    { id: '2', slug: 'perspectives', names: { ca: 'Perspectives', en: 'Perspectives' } },
    { id: '3', slug: 'influencies', names: { ca: 'Influències', en: 'Influences' } },
  ],
  keywords: [
    { id: '10', language: 'ca', value: 'Mon' },
    { id: '2', language: 'ca', value: 'Món' },
    { id: '5', language: 'ca', value: 'Silenci' },
    { id: '7', language: 'ca', value: 'Orfe' },
    { id: 'world', language: 'en', value: 'World' },
    { id: 'silence', language: 'en', value: 'Silence' },
  ],
};

const image = (title: string) => ({ title, alt: '', contentType: 'image/webp', sizeBytes: 10 });
const emptyTranslation = (id: string) => ({
  id,
  title: '',
  slug: '',
  content: '',
  translationStatus: 'incomplete' as const,
  keywords: [],
  references: [],
});

function post(
  id: string,
  {
    ca = true,
    en = true,
    category = 'vivencies',
    sortOrder = Number(id),
    date = '2026-01-01',
  }: { ca?: boolean; en?: boolean; category?: string; sortOrder?: number; date?: string } = {}
): PublishedPost {
  const categoryId = catalog.categories.find((item) => item.slug === category)!.id;
  const translation = (lang: 'ca' | 'en', title: string, slug: string) => ({
    id: `${id}-${lang}`,
    title,
    slug,
    content: `Text ${id} ${lang}`,
    translationStatus: 'complete' as const,
    keywords: [],
    references: [],
  });
  return {
    id,
    version: 1,
    published: true,
    category: { id: categoryId, slug: category },
    sortOrder,
    date,
    translations: {
      ca: ca ? translation('ca', `Títol ${id}`, `titol-${id}`) : emptyTranslation(`${id}-ca`),
      en: en ? translation('en', `Title ${id}`, `title-${id}`) : emptyTranslation(`${id}-en`),
    },
    mainImage: null,
    thumbImage: null,
  };
}

/** 55 posts: more than one reader page, several listing pages, every image combination. */
function baseFixture(): SiteFixture {
  const bilingual = post('1');
  bilingual.translations.ca.title = `${SENTINEL} u`;
  bilingual.translations.ca.content =
    'Primer paràgraf\n\nSegon <script>alert(1)</script><a href="javascript:x()">enllaç</a>';
  // HTML content goes through the sanitizer rather than plain-text escaping.
  bilingual.translations.en.content =
    '<p>English</p><script>alert(2)</script><p><a href="javascript:y()">link</a></p>';
  bilingual.translations.ca.keywords = [{ id: '10', value: 'Mon' }];
  bilingual.translations.en.keywords = [{ id: 'world', value: 'World' }];
  bilingual.translations.ca.references = [
    { id: 'r3', type: 'text', reference: 'Tercera font', sortOrder: 3 },
    { id: 'r1', type: 'image', reference: 'Foto arxiu', blockquote: 'Peu', sortOrder: 1 },
    { id: 'r2', type: 'text', reference: 'Segona font', blockquote: 'Cita', sortOrder: 2 },
  ];
  bilingual.mainImage = image('Hero 1');
  bilingual.thumbImage = image('Thumb 1');

  // Post 64 in production: complete CA, EN has a title but no slug.
  const post64 = post('64');
  post64.translations.en = {
    ...post64.translations.en,
    slug: '',
    translationStatus: 'incomplete',
    keywords: [{ id: 'world', value: 'World' }],
  };
  post64.translations.ca.keywords = [{ id: '2', value: 'Món' }];
  post64.mainImage = image('Hero 64');

  const englishOnly = post('3', { ca: false, category: 'perspectives' });
  englishOnly.thumbImage = image('Thumb 3');

  const unpublishTarget = post('5');
  unpublishTarget.translations.ca.keywords = [{ id: '5', value: 'Silenci' }];
  unpublishTarget.translations.en.keywords = [{ id: 'silence', value: 'Silence' }];

  const fillers = Array.from({ length: 50 }, (_, index) => {
    const id = String(index + 6);
    // 6 and 7 share a sort order; the newer date comes first.
    const sortOrder = id === '7' ? 6 : Number(id);
    const date = id === '7' ? '2026-02-01' : '2026-01-01';
    return post(id, { en: false, category: 'perspectives', sortOrder, date });
  });

  return {
    revision: 1,
    catalog,
    posts: [bilingual, post64, englishOnly, post('4'), unpublishTarget, ...fillers],
  };
}

async function buildSite(name: string, fixture: SiteFixture, cacheDir: string) {
  const fixturePath = join(work, `${name}.json`);
  const outDir = join(work, name);
  writeFileSync(fixturePath, JSON.stringify(fixture));
  // Vitest exports DEV/MODE/SSR into process.env, which would put the child's
  // loader in dev mode where failures keep cached (here: empty) entries.
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR };
  try {
    const { stdout, stderr } = await run('node', [builder, fixturePath, outDir, cacheDir], {
      cwd: root,
      env,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { ok: true, outDir, log: stdout + stderr };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { ok: false, outDir, log: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

const page = (outDir: string, route: string) =>
  readFileSync(join(outDir, route, route.endsWith('.xml') ? '' : 'index.html'), 'utf8');
const exists = (outDir: string, route: string) => existsSync(join(outDir, route, 'index.html'));
const links = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
const sitemap = (outDir: string) => readFileSync(join(outDir, 'sitemap-0.xml'), 'utf8');

afterAll(() => {
  if (!process.env.SITE_BUILD_KEEP) rmSync(work, { recursive: true, force: true });
});

describe('fixture site build', () => {
  const cacheDir = join(work, 'cache');
  let out = '';
  let second = '';

  beforeAll(async () => {
    const first = await buildSite('first', baseFixture(), cacheDir);
    expect(first.ok, first.log).toBe(true);
    out = first.outDir;

    // Unpublish post 5 between two builds that share the content-layer cache,
    // as consecutive Vercel builds do.
    const fixture = baseFixture();
    fixture.revision = 2;
    fixture.posts = fixture.posts.filter((item) => item.id !== '5');
    const rebuilt = await buildSite('second', fixture, cacheDir);
    expect(rebuilt.ok, rebuilt.log).toBe(true);
    second = rebuilt.outDir;
  }, 240_000);

  it('renders fixture content rather than any live source', () => {
    expect(page(out, 'ca/reflexions/titol-1')).toContain(SENTINEL);
  });

  it('emits one page per usable translation and omits the rest', () => {
    for (const route of [
      'ca/reflexions/titol-1',
      'en/reflexions/title-1',
      'ca/reflexions/titol-64',
    ])
      expect(exists(out, route), route).toBe(true);
    expect(exists(out, 'en/reflexions/title-3')).toBe(true);
    expect(exists(out, 'ca/reflexions/titol-3')).toBe(false);
    expect(exists(out, 'en/reflexions/title-64')).toBe(false);
    expect(exists(out, 'en/reflexions/title-10')).toBe(false);
  });

  it('never links a post to a translation that does not exist', () => {
    const hrefs = files(out)
      .filter((file) => file.endsWith('.html'))
      .flatMap((file) => links(readFileSync(file, 'utf8')))
      .filter((href) => /^\/(ca|en)\/reflexions\/(titol|title)-/.test(href));
    for (const href of new Set(hrefs)) expect(exists(out, href.slice(1)), href).toBe(true);
  });

  it('sanitizes and paragraphifies post HTML', () => {
    const html = page(out, 'ca/reflexions/titol-1');
    expect(html).toContain('<p>Primer paràgraf</p>');
    // Plain text is escaped, never parsed as markup.
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    const english = page(out, 'en/reflexions/title-1');
    expect(english).toContain('<p>English</p>');
    expect(english).not.toContain('alert(2)');
    for (const markup of [html, english]) {
      expect(markup).not.toMatch(/<script>alert|<a href="javascript:/);
    }
  });

  it('renders references in order, by type, with optional blockquotes', () => {
    const html = page(out, 'ca/reflexions/titol-1');
    const text = html.indexOf('Segona font');
    expect(text).toBeGreaterThan(-1);
    expect(html.indexOf('Tercera font')).toBeGreaterThan(text);
    expect(html).toContain('Foto arxiu');
    expect(html.match(/<blockquote/g)).toHaveLength(2);
    expect(page(out, 'en/reflexions/title-1')).not.toContain('Segona font');
  });

  it('applies every main/thumb image combination with stable local URLs', () => {
    expect(page(out, 'ca/reflexions/titol-1')).toContain('/content-images/1-main.webp');
    expect(page(out, 'en/reflexions/title-3')).not.toContain('/content-images/3-main.webp');
    const listing = page(out, 'ca/reflexions');
    expect(listing).toContain('/content-images/1-thumb.webp');
    expect(listing).toContain('/images/inici_img.webp');
    expect(page(out, 'ca/reflexions/index')).toBeTruthy();
    const all = files(out)
      .filter((file) => file.endsWith('.html'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    // Post 64 has only a main image: its thumbnail falls back to it.
    expect(all).toContain('/content-images/64-main.webp');
    expect(all).not.toContain('/content-images/64-thumb.webp');
    // Post 3 has only a thumbnail.
    expect(all).toContain('/content-images/3-thumb.webp');
  });

  it('keeps category pages, including empty ones, in both languages', () => {
    for (const lang of ['ca', 'en']) {
      expect(exists(out, `${lang}/reflexions/influencies`), lang).toBe(true);
      expect(exists(out, `${lang}/reflexions/vivencies`), lang).toBe(true);
    }
    expect(page(out, 'ca/reflexions/vivencies')).toContain('Vivències');
    expect(page(out, 'en/reflexions/vivencies')).toContain('Experiences');
  });

  it('groups keywords per language with the smallest-ID label', () => {
    const mon = page(out, 'ca/reflexions/paraula-clau/mon');
    expect(mon).toContain('Món');
    expect(mon).toContain('/ca/reflexions/titol-1');
    expect(mon).toContain('/ca/reflexions/titol-64');
    const world = page(out, 'en/reflexions/keyword/world');
    expect(world).toContain('/en/reflexions/title-1');
    expect(world).not.toContain('title-64');
    expect(exists(out, 'ca/reflexions/paraula-clau/orfe')).toBe(false);
  });

  it('paginates by six and orders by sort order then newest date', () => {
    // 54 CA posts: 1, 4, 5, 6-55 and 64.
    expect(exists(out, 'ca/reflexions/9')).toBe(true);
    expect(exists(out, 'ca/reflexions/10')).toBe(false);
    expect(exists(out, 'en/reflexions/2')).toBe(false);
    const listing = page(out, 'ca/reflexions');
    expect(listing.indexOf('titol-7')).toBeLessThan(listing.indexOf('titol-6'));
    const navigation = links(page(out, 'ca/reflexions/titol-5'));
    expect(navigation).toContain('/ca/reflexions/titol-4');
    expect(navigation).toContain('/ca/reflexions/titol-7');
  });

  it('lists every published translation in RSS and the sitemap', () => {
    const caRss = page(out, 'ca/rss.xml');
    expect(caRss.match(/<item>/g)).toHaveLength(54);
    expect(page(out, 'en/rss.xml').match(/<item>/g)).toHaveLength(4);
    const map = sitemap(out);
    expect(map).toContain('https://tonibover.cat/ca/reflexions/titol-64/');
    expect(map).toContain('https://tonibover.cat/en/reflexions/title-3/');
    expect(map).not.toContain('title-64');
  });

  it('ships no private or expiring storage URL', () => {
    for (const file of files(out)) {
      if (!/\.(html|xml|js|css|json)$/.test(file)) continue;
      expect(readFileSync(file, 'utf8'), relative(out, file)).not.toMatch(
        /amazonaws\.com|X-Amz-|AWS4-HMAC-SHA256/i
      );
    }
  });

  it('drops an unpublished post everywhere on the next build (admin #58)', () => {
    expect(exists(second, 'ca/reflexions/titol-5')).toBe(false);
    expect(exists(second, 'en/reflexions/title-5')).toBe(false);
    expect(exists(second, 'ca/reflexions/paraula-clau/silenci')).toBe(false);
    expect(exists(second, 'en/reflexions/keyword/silence')).toBe(false);
    for (const file of files(second)) {
      if (!/\.(html|xml)$/.test(file)) continue;
      expect(readFileSync(file, 'utf8'), relative(second, file)).not.toMatch(
        /titol-5\/|title-5\/|titol-5"|title-5"|Títol 5<|Title 5</
      );
    }
    const navigation = links(page(second, 'ca/reflexions/titol-4'));
    expect(navigation).toContain('/ca/reflexions/titol-7');
    expect(page(second, 'ca/rss.xml').match(/<item>/g)).toHaveLength(53);
    expect(page(second, 'en/rss.xml').match(/<item>/g)).toHaveLength(3);
  });
});

describe('failing fixture builds', () => {
  it.each([
    [
      'a draft detail',
      (fixture: SiteFixture) => {
        fixture.rawDetails = { '4': { ...fixture.posts[3], published: false } };
      },
      /Malformed build reader post detail/,
    ],
    [
      'a duplicate language/slug route',
      (fixture: SiteFixture) => {
        fixture.posts[3].translations.ca.slug = 'titol-1';
      },
      /Duplicate language\/slug route/,
    ],
    [
      'a slug shadowed by a category page',
      (fixture: SiteFixture) => {
        fixture.posts[3].translations.ca.slug = 'vivencies';
      },
      /collides with a listing route/,
    ],
  ])(
    'fails the build on %s',
    async (name, mutate, pattern) => {
      const fixture = baseFixture();
      mutate(fixture);
      const result = await buildSite(
        `fail-${name.replace(/\W+/g, '-')}`,
        fixture,
        join(work, `cache-${name.replace(/\W+/g, '-')}`)
      );
      expect(result.ok).toBe(false);
      expect(result.log).toMatch(pattern);
    },
    120_000
  );
});
