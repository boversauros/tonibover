import type { Tables } from '../database.types';

export type Lang = 'ca' | 'en';

export const CA_LANGUAGE_ID = 1;
export const EN_LANGUAGE_ID = 2;

export const LANG_BY_ID: Record<number, Lang> = {
  [CA_LANGUAGE_ID]: 'ca',
  [EN_LANGUAGE_ID]: 'en',
};

export type RawJoinedImage = Pick<Tables<'images'>, 'id' | 'url' | 'title' | 'alt'>;

export type RawJoinedTranslation = Pick<
  Tables<'post_translations'>,
  'id' | 'language_id' | 'title' | 'slug' | 'content'
>;

export type RawJoinedPost = Pick<
  Tables<'posts'>,
  'id' | 'category_id' | 'is_published' | 'date' | 'sort_order'
> & {
  category: { slug: string } | null;
  post_translations: RawJoinedTranslation[];
  thumbnail: RawJoinedImage | null;
  image: RawJoinedImage | null;
};

export type RawPostReferenceRow = Pick<
  Tables<'post_references'>,
  'post_translation_id' | 'type' | 'reference' | 'blockquote' | 'sort_order'
>;

export type RawPostKeywordRow = {
  post_translation_id: number;
  keywords: { keyword: string } | { keyword: string }[] | null;
};

export type ReferenceType = 'text' | 'image' | 'blockquote';

export interface Reference {
  type: ReferenceType;
  reference: string;
  blockquote: string | null;
  sort_order: number;
}

export interface PostEntry {
  id: string;
  slug: string;
  title: string;
  date: string;
  category: string;
  html: string;
  image?: { url: string; alt: string };
  thumbnail: { url: string; alt: string };
  references: Reference[];
  keywords: string[];
  sort_order: number;
  lang: Lang;
  availableLangs: Lang[];
}
