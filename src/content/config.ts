import { defineCollection, z } from 'astro:content';
import { postsLoader } from '@/lib/loaders/posts';

const posts = defineCollection({
  loader: postsLoader(),
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
    lang: z.literal('ca'),
  }),
});

export const collections = {
  posts,
};
