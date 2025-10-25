import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['influencies', 'perspectives', 'vivencies']),
    images: z
      .array(
        z.object({
          url: z.string(),
          title: z.string(),
        })
      )
      .min(1),
    portraitImage: z.object({
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
