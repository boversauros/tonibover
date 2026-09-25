import { defineCollection, z } from 'astro:content';
import { postsLoader } from '@/lib/loaders/posts';
import { categoriesLoader } from '@/lib/loaders/categories';
import { keywordsLoader } from '@/lib/loaders/keywords';
import { siteCollectionLoader } from '@/lib/loaders/site-collections';
import { resolveContentSource } from '@/lib/loaders/content-source';

const contentSource = resolveContentSource();

const posts = defineCollection({
  loader: contentSource === 'aws' ? siteCollectionLoader('posts') : postsLoader(),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    html: z.string(),
    image: z
      .object({
        url: z.string(),
        alt: z.string(),
      })
      .optional(),
    thumbnail: z.object({
      url: z.string(),
      alt: z.string(),
    }),
    references: z.array(
      z.object({
        type: z.enum(['text', 'image', 'blockquote']),
        reference: z.string(),
        blockquote: z.string().nullable(),
        sort_order: z.number(),
      })
    ),
    keywords: z.array(z.string()),
    sort_order: z.number(),
    lang: z.enum(['ca', 'en']),
    availableLangs: z.array(z.enum(['ca', 'en'])),
  }),
});

const categories = defineCollection({
  loader: contentSource === 'aws' ? siteCollectionLoader('categories') : categoriesLoader(),
  schema: z.object({
    slug: z.string(),
    name: z.object({
      ca: z.string(),
      en: z.string(),
    }),
  }),
});

const keywords = defineCollection({
  loader: contentSource === 'aws' ? siteCollectionLoader('keywords') : keywordsLoader(),
  schema: z.object({
    slug: z.string(),
    lang: z.enum(['ca', 'en']),
    label: z.string(),
    postIds: z.array(z.string()),
  }),
});

export const collections = {
  posts,
  categories,
  keywords,
};
