# Implementation Plan: Card UI Component

## Overview

Create a flexible Card component to consolidate PostGrid and Preambul card patterns. Use composition-based approach with slots for maximum flexibility and alignment with existing UI component patterns.

## Goals

1. Create Card component (`/src/components/ui/Card.astro`) with slot-based composition
2. Migrate PostGrid to use Card component
3. Migrate Preambul page to use Card component
4. Maintain zero visual regressions

---

## Component Design

### Card Component (`/src/components/ui/Card.astro`)

**Approach:** Minimal, composition-based component that provides card structure and delegates content to slots.

**Props Interface:**

```typescript
interface Props {
  href: string; // Link destination
  as?: 'article' | 'div'; // Semantic wrapper (default: 'div')
  class?: string; // Additional classes
  'aria-label'?: string; // Accessibility label
}
```

**Structure:**

- Wrapper element (`<article>` or `<div>`) with `space-y-4` spacing
- Link component with `group block` classes (enables hover effects)
- Named `image` slot for Image component
- Default slot for all content below image

**Implementation:**

```astro
---
import Link from '@components/ui/Link.astro';

interface Props {
  href: string;
  as?: 'article' | 'div';
  class?: string;
  'aria-label'?: string;
}

const { href, as: Wrapper = 'div', class: className = '', 'aria-label': ariaLabel } = Astro.props;

const hasImageSlot = Astro.slots.has('image');
const cardClasses = `space-y-4 ${className}`.trim();
---

<Wrapper class={cardClasses}>
  <Link href={href} class="group block" aria-label={ariaLabel}>
    {hasImageSlot && <slot name="image" />}
    <slot />
  </Link>
</Wrapper>
```

---

## Usage Examples

### PostGrid Pattern (After Migration)

```astro
<Card href={`/reflexions/${post.slug}`} as="article" aria-label={`Read ${post.data.title}`}>
  <Image
    slot="image"
    src={post.data.portraitImage.url}
    alt={post.data.portraitImage.title}
    aspect="4/3"
    hover="scale"
  />
  <div class="space-y-2 pt-4">
    <p class="text-sm text-muted font-serif">
      {category.name}
    </p>
    <h3
      class="text-lg font-serif text-secondary group-hover:text-primary transition-colors-default"
    >
      {post.data.title}
    </h3>
  </div>
</Card>
```

### Preambul Pattern (After Migration)

```astro
<Card href="/preambul/20" aria-label="Descobrir més sobre procés trans a la màquina">
  <Image
    slot="image"
    src="https://picsum.photos/400/300"
    alt="Un procés trans a la màquina"
    aspect="square"
    hover="opacity"
  />
  <div class="space-y-2">
    <span class="block text-3xl font-serif text-secondary">20</span>
    <Heading as="h3" size="2xl" variant="secondary" class="mb-0">
      UN PROCÉS TRANS A LA MÀQUINA
    </Heading>
    <Text variant="small" class="group-hover:text-body transition-colors"> Descobrir més → </Text>
  </div>
</Card>
```

---

## Implementation Steps

### Phase 1: Create Card Component

**Step 1: Create `/src/components/ui/Card.astro`**

- Import Link component
- Define TypeScript interface with 4 props
- Implement dynamic wrapper (article vs div based on `as` prop)
- Add Link with `group block` classes
- Implement conditional image slot rendering
- Add default slot for content
- Ensure proper class concatenation with `space-y-4`

**Verification:**

- TypeScript types compile correctly
- No imports missing
- Slot logic handles both named and default slots

---

### Phase 2: Migrate PostGrid

**Step 2.1: Update `/src/components/app/PostGrid.astro`**

**Changes (lines 14-37):**

1. Import Card: `import Card from '@components/ui/Card.astro';`
2. Replace `<article class="space-y-4">` with `<Card as="article">`
3. Remove `<Link>` wrapper (Card handles this)
4. Move `<Image>` to use `slot="image"` attribute
5. Keep content `<div>` with category and title as-is (goes to default slot)
6. Add `aria-label` prop to Card for accessibility

**Before (lines 17-34):**

```astro
<article class="space-y-4">
  <Link href={`/reflexions/${post.slug}`} class="group block">
    <Image ... />
    <div class="space-y-2 pt-4">
      <p>...</p>
      <h3>...</h3>
    </div>
  </Link>
</article>
```

**After:**

```astro
<Card href={`/reflexions/${post.slug}`} as="article" aria-label={`Read ${post.data.title}`}>
  <Image slot="image" ... />
  <div class="space-y-2 pt-4">
    <p>...</p>
    <h3>...</h3>
  </div>
</Card>
```

**Step 2.2: Test PostGrid**

- Navigate to `/reflexions` page
- Verify all posts display correctly
- Check image aspect (4/3) and scale hover
- Verify title color change on hover (secondary → primary)
- Test responsive grid (2 columns on desktop)
- Verify links navigate correctly

---

### Phase 3: Migrate Preambul

**Step 3.1: Update `/src/pages/preambul/index.astro`**

**Changes (apply to all 3 cards at lines 27-45, 47-65, 67-85):**

1. Import Card: `import Card from '@components/ui/Card.astro';`
2. Replace `<Link href="..." class="group block">` with `<Card href="...">`
3. Remove inner `<div class="space-y-4">` wrapper (Card provides this)
4. Add `slot="image"` to `<Image>` component
5. Keep content `<div>` with number, Heading, and Text as-is
6. Add `aria-label` to each Card

**Before (lines 27-45):**

```astro
<Link href="/preambul/20" class="group block">
  <div class="space-y-4">
    <Image ... />
    <div class="space-y-2">
      <span>20</span>
      <Heading>...</Heading>
      <Text>...</Text>
    </div>
  </div>
</Link>
```

**After:**

```astro
<Card href="/preambul/20" aria-label="Descobrir més sobre procés trans a la màquina">
  <Image slot="image" ... />
  <div class="space-y-2">
    <span>20</span>
    <Heading>...</Heading>
    <Text>...</Text>
  </div>
</Card>
```

**Step 3.2: Test Preambul**

- Navigate to `/preambul` page
- Verify all 3 cards display correctly
- Check image aspect (square) and opacity hover
- Verify CTA color change on hover (muted → body)
- Test responsive grid (3 columns on desktop)
- Verify links navigate correctly

---

### Phase 4: Final Verification

**Visual Regression Testing:**

- Compare before/after of `/reflexions` page
- Compare before/after of `/preambul` page
- Verify all spacing matches original (gap-8, space-y-4, space-y-2, pt-4)
- Verify all colors match original

**Accessibility:**

- Verify semantic HTML maintained (article tags for PostGrid)
- Check aria-labels are meaningful
- Test keyboard navigation
- Verify hover states work with keyboard focus

**Code Quality:**

- No console errors
- TypeScript compiles successfully
- All imports use path aliases (`@components/ui/...`)
- No unused imports

---

## Critical Files

### Files to Create:

1. `/src/components/ui/Card.astro` - New Card component

### Files to Modify:

1. `/src/components/app/PostGrid.astro` (lines 14-37)

   - Add Card import
   - Migrate article cards to use Card component

2. `/src/pages/preambul/index.astro` (lines 27-85)
   - Add Card import
   - Migrate all 3 Link cards to use Card component

### Files to Reference:

1. `/src/components/ui/Link.astro` - Link component API
2. `/src/components/ui/Image.astro` - Image component API

---

## Design Decisions

**Composition over Configuration:**

- Use slots instead of variant props
- Delegates all styling to consumer
- Maximum flexibility for future card patterns

**Minimal Props:**

- Only essential props: `href`, `as`, `class`, `aria-label`
- No image props (users compose with Image component)
- No content structure props (users use slots)

**Named Image Slot:**

- Separates image from content
- Maintains flexibility for no-image cards
- Users control all Image props

**Wrapper Flexibility:**

- `as` prop for semantic HTML (article vs div)
- PostGrid uses article (blog posts)
- Preambul uses div (navigation cards)

**Group Pattern:**

- Hard-coded `group block` on Link
- Essential for hover effects on child elements
- All cards need this, so not optional

---

## Success Criteria

**Functional:**

- Card component renders with correct structure
- Both wrapper types (article/div) work
- Named slots function correctly
- Links navigate properly
- All props typed correctly

**Visual:**

- Zero regressions on `/reflexions` page
- Zero regressions on `/preambul` page
- All spacing matches original
- All hover effects identical
- Responsive layouts unchanged

**Accessibility:**

- Semantic HTML maintained
- Meaningful aria-labels
- Keyboard navigation works
- Group hover works with focus

**Code Quality:**

- TypeScript compilation succeeds
- No console errors
- Path aliases used consistently
- Follows existing UI component patterns

---

## Why This Approach?

The composition-based design:

- Aligns with existing UI components (Link, Image, Heading, Text all use slots)
- Provides flexibility without complex configuration
- Easier to maintain and extend
- Supports future card patterns without modifications
- Keeps the component simple and focused

**PostGrid and Preambul have fundamentally different content structures**, so composition is better than trying to configure variants with props.
