# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm preview   # Preview production build
pnpm format    # Format code with Prettier
```

## Architecture

This is **Toni Bover's personal site** - an Astro 5 site with Tailwind CSS 4, supporting Catalan (default) and English.

### Internationalization

- **Default locale**: Catalan (`ca`) - no URL prefix
- **English**: Uses `/en/` prefix
- Translations in `src/i18n/ca.ts` and `src/i18n/en.ts`
- Use `useTranslations(lang)` to get the `t()` function
- Use `getLocalizedPath(path, lang)` for localized URLs

### Content

Posts are in `src/content/posts/` as Markdown with frontmatter:

- Categories: `influencies`, `perspectives`, `vivencies`
- Required: `title`, `category`, `images`, `portraitImage`, `keywords`, `references`

### Components

Three-tier component organization:

- `components/ui/` - Base primitives (Button, Link, Text, Heading, Image, Icon)
- `components/composed/` - Combinations of UI components
- `components/app/` - Feature-specific (Navigation, Carousel, PostGrid)

### Styling

- **Tailwind CSS 4** via Vite plugin (not PostCSS)
- Design tokens in `src/styles/global.css` as CSS custom properties
- Semantic utility classes defined in `@layer utilities` (e.g., `text-primary`, `bg-surface`, `border-subtle`)
- Fonts: Nunito (sans) and Bodoni Moda Variable (serif) via @fontsource

### Spacing System

All spacing uses design tokens via `sp-` prefixed utility classes defined in `global.css`:

**Tokens** (`--spacing-*`): 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24, 32, 40

**Utility classes**:

- Margins: `mb-sp-*`, `mt-sp-*`, `my-sp-*`, `mr-sp-*`, `ml-sp-*`
- Padding: `pt-sp-*`, `pb-sp-*`, `py-sp-*`, `px-sp-*`, `pl-sp-*`, `p-sp-*`
- Gap: `gap-sp-*`
- Space: `space-y-sp-*`, `space-x-sp-*`
- Responsive: `md:px-sp-*`, `md:gap-sp-*`

**Container presets** (in `@layer components`):

- `container-spacing-default` - `pt-32 pb-16`
- `container-spacing-compact` - `pt-16 pb-8`
- `container-spacing-loose` - `pt-40 pb-24`

Always use `sp-` classes instead of raw Tailwind spacing (e.g., `mb-sp-6` not `mb-6`).

### Path Aliases

```
@/*          → src/*
@components/* → src/components/*
@layouts/*    → src/layouts/*
@styles/*     → src/styles/*
```
