// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['influencies', 'perspectives', 'vivencies']),
    date: z.string(),
    image: z.object({
      url: z.string(),
      title: z.string(),
    }),
    keywords: z.array(z.string()),
    references: z.object({
      images: z.array(z.string()),
      texts: z.array(z.string()),
    }),
  }),
});

export const collections = {
  posts,
};
