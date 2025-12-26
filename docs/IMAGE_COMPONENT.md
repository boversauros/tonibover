# Implementation Plan: Image UI Component

## Overview

Create a reusable Image component (`/src/components/ui/Image.astro`) to standardize image patterns across the codebase, reduce duplication, and add performance improvements via lazy loading.

## Goals

1. Create Image component with aspect ratio variants (square, 4/3, video, auto)
2. Support hover effects (opacity fade, scale zoom, none)
3. Enable lazy loading by default with opt-out
4. Support optional captions via named slot
5. Migrate 6 files to use the new component
6. Maintain zero visual regressions

---

## Component Specification

### Props Interface

```typescript
interface Props {
  src: string;                                    // Required
  alt: string;                                    // Required
  aspect?: 'square' | '4/3' | 'video' | 'auto';  // Default: 'auto'
  hover?: 'opacity' | 'scale' | 'none';          // Default: 'opacity'
  loading?: 'lazy' | 'eager';                    // Default: 'lazy'
  width?: string;                                // Default: 'w-full'
  height?: string;                               // Default: ''
  class?: string;                                // Custom overrides
  [key: string]: any;                            // Pass-through attributes
}
```

### Variants

**Aspect Ratios:**
- `square` → `aspect-square` (1:1) - Used in Carousel, Preambul cards
- `4/3` → `aspect-4/3` - Used in PostGrid, PreambulLayout
- `video` → `aspect-video` (16/9) - Future-proofing
- `auto` → No aspect class - Natural dimensions

**Hover Effects:**
- `opacity` → `group-hover:opacity-90 transition-opacity duration-700` - Most common pattern
- `scale` → `group-hover:scale-105 transition-transform duration-300` - Used in PostGrid
- `none` → No hover effect - Used in Carousel

### Caption Slot

- Named slot: `<slot name="caption" />`
- When present: wraps image in `<figure>` with `<figcaption>`
- Caption styling: `text-sm text-muted font-serif italic leading-relaxed`
- Figure spacing: `space-y-3`

### Wrapper Strategy

- **With caption**: `<figure>` + inner `<div class="group overflow-hidden">` for image
- **Without caption**: `<div class="group overflow-hidden">` wrapper only
- `overflow-hidden` added when `hover="scale"` to prevent overflow
- `group` class enables `group-hover` to work regardless of parent context

---

## Implementation

### Component Code

File: `/src/components/ui/Image.astro`

```astro
---
interface Props {
  src: string;
  alt: string;
  aspect?: 'square' | '4/3' | 'video' | 'auto';
  hover?: 'opacity' | 'scale' | 'none';
  loading?: 'lazy' | 'eager';
  width?: string;
  height?: string;
  class?: string;
  [key: string]: any;
}

const {
  src,
  alt,
  aspect = 'auto',
  hover = 'opacity',
  loading = 'lazy',
  width = 'w-full',
  height = '',
  class: className = '',
  ...rest
} = Astro.props;

const hasCaption = Astro.slots.has('caption');

const aspectClasses = {
  'square': 'aspect-square',
  '4/3': 'aspect-4/3',
  'video': 'aspect-video',
  'auto': '',
};

const hoverClasses = {
  'opacity': 'group-hover:opacity-90 transition-opacity duration-700',
  'scale': 'group-hover:scale-105 transition-transform duration-300',
  'none': '',
};

const imageClasses = `${width} ${height} ${aspectClasses[aspect]} object-cover ${hoverClasses[hover]} ${className}`.trim();
const overflowClass = hover === 'scale' ? 'overflow-hidden' : '';
---

{hasCaption ? (
  <figure class="space-y-3">
    <div class={`group ${overflowClass}`}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        class={imageClasses}
        {...rest}
      />
    </div>
    <figcaption class="text-sm text-muted font-serif italic leading-relaxed">
      <slot name="caption" />
    </figcaption>
  </figure>
) : (
  <div class={`group ${overflowClass}`}>
    <img
      src={src}
      alt={alt}
      loading={loading}
      class={imageClasses}
      {...rest}
    />
  </div>
)}
```

---

## Migration Strategy

### Phase 1: Create Component
1. Create `/src/components/ui/Image.astro` with implementation above
2. No breaking changes - component is additive only

### Phase 2: Migrate Files (In Order)

#### 1. `/src/pages/index.astro` (lines 14-19)
**Before:**
```astro
<img
  src="https://picsum.photos/1200/800"
  alt="Artistic Photography"
  class="w-full transition-opacity duration-700 hover:opacity-95"
/>
<Text variant="caption">Fotografia Toni Bover, 1990</Text>
```

**After:**
```astro
<Image
  src="https://picsum.photos/1200/800"
  alt="Artistic Photography"
  aspect="auto"
  hover="opacity"
  loading="eager"
>
  <span slot="caption">Fotografia Toni Bover, 1990</span>
</Image>
```

**Note:** Hero image should use `loading="eager"` (above-fold)

---

#### 2. `/src/layouts/PreambulLayout.astro` (lines 35-46)
**Before:**
```astro
<figure class="space-y-3">
  <img src={image.src} alt={image.alt} class="w-full aspect-4/3 object-cover" />
  {image.caption && (
    <figcaption class="text-sm text-muted italic">{image.caption}</figcaption>
  )}
</figure>
```

**After:**
```astro
<Image
  src={image.src}
  alt={image.alt}
  aspect="4/3"
  hover="none"
>
  {image.caption && <span slot="caption">{image.caption}</span>}
</Image>
```

---

#### 3. `/src/components/app/Carousel.astro` (lines 18-61)
**Before:**
```astro
<img
  src="https://picsum.photos/300/300"
  alt="Family photo from 1957"
  class="w-[250px] md:w-[300px] aspect-square object-cover"
/>
```

**After:**
```astro
<Image
  src="https://picsum.photos/300/300"
  alt="Family photo from 1957"
  aspect="square"
  hover="none"
  width="w-[250px] md:w-[300px]"
/>
```

**Note:** Update all 4 images in carousel

---

#### 4. `/src/pages/preambul/index.astro` (lines 26-77)
**Context:** Images are wrapped in Link components with `group` class

**Before:**
```astro
<Link href="/preambul/20" class="group block">
  <img
    src="https://picsum.photos/400/400"
    alt="Un procés trans a la màquina"
    class="w-full aspect-square object-cover transition-opacity duration-700 group-hover:opacity-90"
  />
</Link>
```

**After:**
```astro
<Link href="/preambul/20" class="group block">
  <Image
    src="https://picsum.photos/400/400"
    alt="Un procés trans a la màquina"
    aspect="square"
    hover="opacity"
  />
</Link>
```

**Note:** Update all 3 card images. The Link's `group` class will work with Image's `group-hover` classes.

---

#### 5. `/src/components/app/PostGrid.astro` (lines 17-24)
**Context:** Image wrapped in Link with overflow-hidden div

**Before:**
```astro
<Link href={`/reflexions/${post.slug}`} class="group block">
  <div class="overflow-hidden">
    <img
      src={post.data.portraitImage.url}
      alt={post.data.portraitImage.title}
      class="w-full aspect-4/3 object-cover transition-transform duration-300 group-hover:scale-105"
    />
  </div>
</Link>
```

**After:**
```astro
<Link href={`/reflexions/${post.slug}`} class="group block">
  <Image
    src={post.data.portraitImage.url}
    alt={post.data.portraitImage.title}
    aspect="4/3"
    hover="scale"
  />
</Link>
```

**Note:** Image component handles overflow-hidden internally when hover="scale"

---

#### 6. `/src/pages/reflexions/[...slug].astro` (lines 77-84)
**Before:**
```astro
<figure class="space-y-3">
  <img src={image.url} alt={image.title} class="w-full h-[400px] object-cover" />
  <figcaption class="text-sm text-muted font-serif italic leading-relaxed">
    {image.title}
  </figcaption>
</figure>
```

**After:**
```astro
<Image
  src={image.url}
  alt={image.title}
  height="h-[400px]"
  hover="none"
  loading="eager"
>
  <span slot="caption">{image.title}</span>
</Image>
```

**Note:** Above-fold images should use `loading="eager"`

---

### Phase 3: Verification

After each migration:
1. **Visual test**: Verify page looks identical to before
2. **Hover test**: Check hover effects work (opacity fade or scale zoom)
3. **Responsive test**: Test mobile and desktop breakpoints
4. **Performance test**: Open DevTools Network tab, verify lazy loading defers image requests
5. **Accessibility test**: Verify alt attributes and figcaption semantics

---

## Critical Files

### Files to Create:
1. `/src/components/ui/Image.astro` - New component

### Files to Modify:
1. `/src/pages/index.astro` - Hero image + caption (lines 14-19)
2. `/src/layouts/PreambulLayout.astro` - Image grid with captions (lines 35-46)
3. `/src/components/app/Carousel.astro` - 4 carousel images (lines 18-61)
4. `/src/pages/preambul/index.astro` - 3 card images (lines 28-31, 45-48, 64-67)
5. `/src/components/app/PostGrid.astro` - Post thumbnail images (lines 17-24)
6. `/src/pages/reflexions/[...slug].astro` - Article image gallery (lines 77-84)

---

## Success Criteria

- ✅ Image component created with all variants
- ✅ All 6 files successfully migrated
- ✅ No visual regressions on any page
- ✅ Hover effects (opacity and scale) work correctly
- ✅ Captions render properly with semantic HTML
- ✅ Lazy loading improves performance (check DevTools)
- ✅ Responsive sizing works at all breakpoints
- ✅ Component follows existing UI component patterns (Button, Link, Heading)
- ✅ TypeScript types defined properly
- ✅ Semantic tokens used consistently

---

## Key Implementation Notes

### Hover Effect Decision
Using `group-hover` pattern exclusively because:
1. Most images are wrapped in Link components (primary use case)
2. Component adds `group` wrapper automatically when needed
3. Provides consistent behavior regardless of parent context

### Caption Pattern
Using named slot (`<slot name="caption" />`) because:
1. More flexible than prop (supports HTML content)
2. Explicit usage: `<span slot="caption">Text</span>`
3. Conditional figure wrapper only when caption exists

### Performance
Lazy loading enabled by default:
- Below-fold images: `loading="lazy"` (default)
- Above-fold images: explicitly set `loading="eager"`
- First implementation of lazy loading in this codebase

### Edge Cases Handled
1. **Custom widths**: Carousel uses `w-[250px] md:w-[300px]` (via `width` prop)
2. **Fixed heights**: Reflexions uses `h-[400px]` (via `height` prop)
3. **Overflow control**: Automatic `overflow-hidden` when `hover="scale"`
4. **Link wrappers**: Works seamlessly with existing Link components
