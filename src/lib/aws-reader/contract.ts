import { z } from 'zod';

export const environmentSchema = z.enum(['dev', 'prod']);
export type Environment = z.infer<typeof environmentSchema>;
export const languageSchema = z.enum(['ca', 'en']);
export type Language = z.infer<typeof languageSchema>;

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const version = z.number().int().positive().safe();
const text = z.string();

export const catalogSchema = z
  .object({
    categories: z.array(
      z
        .object({
          id,
          slug: z.string().min(1),
          names: z.object({ ca: z.string().min(1), en: z.string().min(1) }).strict(),
        })
        .strict()
    ),
    keywords: z.array(
      z.object({ id, language: languageSchema, value: z.string().min(1) }).strict()
    ),
  })
  .strict();

const referenceSchema = z
  .object({
    id,
    type: z.enum(['text', 'image']),
    reference: text,
    blockquote: text.optional(),
    sortOrder: z.number().int().safe(),
  })
  .strict();

const translationSchema = z
  .object({
    id,
    title: text,
    slug: text,
    content: text,
    translationStatus: z.enum(['complete', 'incomplete']),
    keywords: z.array(z.object({ id, value: text }).strict()),
    references: z.array(referenceSchema),
  })
  .strict();

const imageSchema = z
  .object({
    title: text,
    alt: text,
    contentType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative().safe(),
  })
  .strict();

export const postSchema = z
  .object({
    id,
    version,
    published: z.literal(true),
    category: z.object({ id, slug: z.string().min(1) }).strict(),
    sortOrder: z.number().int().safe(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => !Number.isNaN(Date.parse(value))),
    translations: z.object({ ca: translationSchema, en: translationSchema }).strict(),
    mainImage: imageSchema.nullable(),
    thumbImage: imageSchema.nullable(),
  })
  .strict();

export type Catalog = z.infer<typeof catalogSchema>;
export type PublishedPost = z.infer<typeof postSchema>;

export const revisionSchema = z
  .object({ revision: z.number().int().nonnegative().safe() })
  .strict();
export const postsPageSchema = z
  .object({
    items: z.array(z.object({ id, version }).strict()).max(50),
    nextCursor: z.string().min(1).max(2048).nullable(),
  })
  .strict();

export type Operation = 'revision' | 'catalog' | 'posts' | 'post' | 'media';
export type ReaderRequest =
  | { version: 1; environment: Environment; operation: 'revision' | 'catalog' }
  | { version: 1; environment: Environment; operation: 'posts'; limit: 50; cursor?: string }
  | {
      version: 1;
      environment: Environment;
      operation: 'post';
      id: string;
      expectedVersion: number;
    }
  | {
      version: 1;
      environment: Environment;
      operation: 'media';
      postId: string;
      role: 'main' | 'thumb';
      expectedVersion: number;
    };

export const errorCodes = [
  'INVALID_REQUEST',
  'INVALID_CURSOR',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'MEDIA_NOT_ATTACHED',
  'MEDIA_UNAVAILABLE',
  'DATA_UNINITIALIZED',
  'DATA_INTEGRITY',
  'RESULT_TOO_LARGE',
  'THROTTLED',
  'UNAVAILABLE',
] as const;
export type ReaderErrorCode = (typeof errorCodes)[number];

export const envelopeSchema = z
  .object({
    version: z.literal(1),
    environment: environmentSchema,
    ok: z.boolean(),
    data: z.unknown().optional(),
    error: z
      .object({ code: z.enum(errorCodes), retryable: z.boolean() })
      .strict()
      .optional(),
  })
  .strict();
