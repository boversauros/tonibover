import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { useTranslations, getLocalizedPath } from '@/i18n';
import { excerpt } from '@/lib/excerpt';

export async function GET(context: APIContext) {
  const t = useTranslations('ca');
  const posts = await getCollection('posts', ({ data }) => data.lang === 'ca');
  const sorted = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: t('rss.title'),
    description: t('rss.description'),
    site: context.site!,
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: getLocalizedPath(`/reflexions/${post.data.slug}`, 'ca'),
      description: excerpt(post.data.html),
    })),
    customData: '<language>ca-ES</language>',
  });
}
