export type Lang = 'ca' | 'en';

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
