import ca from './ca';
import en from './en';

export const languages = {
  ca: 'Català',
  en: 'English',
} as const;

export const defaultLang = 'ca' as const;

export type Lang = keyof typeof languages;

export const translations = { ca, en } as const;

export type TranslationKey = keyof typeof ca;
