# Implementation Plan: Container UI Component

## Overview

Create a reusable Container component (`/src/components/ui/Container.astro`) to standardize the page layout wrapper pattern that appears in every page. This eliminates the repetitive `<main>` and `<div>` wrapper boilerplate while maintaining consistent spacing and width constraints.

## Goals

1. Create Container component with size and spacing variants
2. Reduce layout boilerplate from 2+ lines to 1 line per page
3. Support different max-width constraints (default, wide, full)
4. Provide consistent vertical padding across all pages
5. Migrate 8+ pages to use the new component
6. Maintain zero visual regressions

---

## Current Pattern Analysis

### Repeated Pattern (appears in all pages)

**Current Implementation:**

```astro
<main class="grow pt-32 pb-16">
  <div class="max-w-4xl mx-auto px-6">
    <!-- page content -->
  </div>
</main>
```

**Files using this exact pattern:**

- `/src/pages/index.astro` (lines 10-11)
- `/src/pages/biografia.astro` (lines 12-13)
- `/src/pages/documental.astro` (lines 11-12)
- `/src/pages/preambul/index.astro` (lines 12-13)
- `/src/pages/404.astro` (likely)
- `/src/pages/reflexions/[...page].astro` (likely)
- And potentially more...

**Issues with current approach:**

- ❌ Duplicated layout code across 8+ files
- ❌ Inconsistent spacing if someone forgets a class
- ❌ Hard to maintain if layout changes (must update all files)
- ❌ Verbose boilerplate detracts from page content
- ❌ No semantic meaning to the wrapper pattern

---

## Component Design

### Container Component (`/src/components/ui/Container.astro`)

**Props Interface:**

```typescript
interface Props {
  as?: 'main' | 'div' | 'section' | 'article'; // Default: 'main'
  size?: 'default' | 'wide' | 'full'; // Default: 'default'
  spacing?: 'default' | 'compact' | 'loose' | 'none'; // Default: 'default'
  class?: string; // Additional classes
}
```

**Size Variants (max-width):**

- `default` → `max-w-4xl` (64rem / 1024px) - Used for most pages
- `wide` → `max-w-6xl` (72rem / 1152px) - For wider content
- `full` → `max-w-full` - For full-width layouts

**Spacing Variants (vertical padding):**

- `default` → `pt-32 pb-16` - Standard page spacing
- `compact` → `pt-16 pb-8` - Tighter spacing
- `loose` → `pt-40 pb-24` - More breathing room
- `none` → No padding - Full control to consumer

**Base Styling:**

- Wrapper element: `grow` (flex-grow: 1 for sticky footer layouts)
- Inner container: `mx-auto px-6` (horizontal centering + padding)

### Implementation

```astro
---
interface Props {
  as?: 'main' | 'div' | 'section' | 'article';
  size?: 'default' | 'wide' | 'full';
  spacing?: 'default' | 'compact' | 'loose' | 'none';
  class?: string;
}

const {
  as: Wrapper = 'main',
  size = 'default',
  spacing = 'default',
  class: className = '',
} = Astro.props;

const sizeClasses = {
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: 'max-w-full',
};

const spacingClasses = {
  default: 'pt-32 pb-16',
  compact: 'pt-16 pb-8',
  loose: 'pt-40 pb-24',
  none: '',
};

const wrapperClasses = `grow ${spacingClasses[spacing]}`.trim();
const innerClasses = `${sizeClasses[size]} mx-auto px-6 ${className}`.trim();
---

<Wrapper class={wrapperClasses}>
  <div class={innerClasses}>
    <slot />
  </div>
</Wrapper>
```

---

## Usage Examples

### Standard Page (Most Common)

**Before:**

```astro
<Layout>
  <main class="grow pt-32 pb-16">
    <div class="max-w-4xl mx-auto px-6">
      <SectionTitle>INICI</SectionTitle>
      <!-- content -->
    </div>
  </main>
</Layout>
```

**After:**

```astro
<Layout>
  <Container>
    <SectionTitle>INICI</SectionTitle>
    <!-- content -->
  </Container>
</Layout>
```

**Reduction:** 4 lines → 3 lines, clearer intent

---

### Wide Layout

**Before:**

```astro
<main class="grow pt-32 pb-16">
  <div class="max-w-6xl mx-auto px-6">
    <!-- wider content -->
  </div>
</main>
```

**After:**

```astro
<Container size="wide">
  <!-- wider content -->
</Container>
```

---

### Custom Spacing

**Before:**

```astro
<main class="grow pt-40 pb-24">
  <div class="max-w-4xl mx-auto px-6">
    <!-- content with more space -->
  </div>
</main>
```

**After:**

```astro
<Container spacing="loose">
  <!-- content with more space -->
</Container>
```

---

### Semantic Wrapper (article instead of main)

**Before:**

```astro
<article class="grow pt-32 pb-16">
  <div class="max-w-4xl mx-auto px-6">
    <!-- article content -->
  </div>
</article>
```

**After:**

```astro
<Container as="article">
  <!-- article content -->
</Container>
```

---

### Additional Custom Classes

```astro
<Container class="bg-surface border-t border-default">
  <!-- content with custom background and border -->
</Container>
```

---

## Implementation Steps

### Phase 1: Create Container Component

**Step 1.1: Create `/src/components/ui/Container.astro`**

1. Define TypeScript Props interface with 4 props
2. Implement size mapping (default, wide, full)
3. Implement spacing mapping (default, compact, loose, none)
4. Add dynamic wrapper element (main, div, section, article)
5. Apply base classes: `grow` on wrapper, `mx-auto px-6` on inner
6. Support custom classes via `class` prop
7. Implement default slot for content

**Step 1.2: Visual Testing**

- Create a test page with all size variants
- Test all spacing variants
- Verify responsive behavior (px-6 padding on mobile)
- Test with different wrapper elements
- Ensure slot content renders properly

**Verification:**

- TypeScript types compile correctly
- All variant combinations work
- No layout shifts compared to original pattern
- Component follows established UI patterns

---

### Phase 2: Migration Strategy

**Migration Order (by impact and simplicity):**

1. **index.astro** - Homepage (simplest case)
2. **biografia.astro** - Standard layout
3. **documental.astro** - Standard layout
4. **preambul/index.astro** - Standard layout
5. **404.astro** - Standard layout
6. **reflexions/[...page].astro** - Check if uses pattern
7. **reflexions/[category]/[...page].astro** - Check if uses pattern
8. **reflexions/paraula-clau/[keyword]/[...page].astro** - Check if uses pattern
9. **reflexions/[...slug].astro** - Check if uses pattern
10. **preambul/20.astro, 40.astro, 60.astro** - Check if uses pattern (might use PreambulLayout)

**For Each Page:**

1. Add import at top: `import Container from '@components/ui/Container.astro';`
2. Replace `<main class="grow pt-32 pb-16">` with `<Container>`
3. Remove inner `<div class="max-w-4xl mx-auto px-6">` wrapper
4. Move content inside `<Container>` component
5. Close with `</Container>` instead of `</div></main>`
6. Test page visually for regressions

---

### Phase 3: Handle Edge Cases

**Layout files check:**

Some pages might use layout components that already handle the wrapper pattern. Check:

- `/src/layouts/PostsListLayout.astro` - might already wrap content
- `/src/layouts/PreambulLayout.astro` - might already wrap content

**If layouts already handle wrapping:**

- Consider adding Container to the layout instead
- Or skip migration for pages using those layouts
- Document the decision

**Pages with custom spacing:**

- Identify any pages with different `pt-*` or `pb-*` values
- Use appropriate spacing variant or create new variant if needed
- Document custom spacing requirements

---

## Migration Examples

### Example 1: index.astro (lines 9-34)

**Before:**

```astro
<Layout>
  <main class="grow pt-32 pb-16">
    <div class="max-w-4xl mx-auto px-6">
      <SectionTitle>INICI</SectionTitle>

      <div class="space-y-8">
        <Image ... />
        <Text variant="body">...</Text>
      </div>
    </div>
  </main>
</Layout>
```

**After:**

```astro
<Layout>
  <Container>
    <SectionTitle>INICI</SectionTitle>

    <div class="space-y-8">
      <Image ... />
      <Text variant="body">...</Text>
    </div>
  </Container>
</Layout>
```

**Changes:**

- Line 1: Add `import Container from '@components/ui/Container.astro';`
- Line 10: Replace `<main class="grow pt-32 pb-16">` with `<Container>`
- Line 11: Remove `<div class="max-w-4xl mx-auto px-6">`
- Line 32: Remove `</div>`
- Line 33: Replace `</main>` with `</Container>`

---

### Example 2: biografia.astro (lines 11-90)

**Before:**

```astro
<Layout>
  <main class="grow pt-32 pb-16">
    <div class="max-w-4xl mx-auto px-6">
      <SectionTitle>BIOGRAFIA</SectionTitle>
      <Heading as="h1" size="4xl" variant="primary">Antoni Bover Tanyà</Heading>
      <!-- ... rest of content ... -->
    </div>
  </main>
</Layout>
```

**After:**

```astro
<Layout>
  <Container>
    <SectionTitle>BIOGRAFIA</SectionTitle>
    <Heading as="h1" size="4xl" variant="primary">Antoni Bover Tanyà</Heading>
    <!-- ... rest of content ... -->
  </Container>
</Layout>
```

**Changes:**

- Line 1: Add import
- Lines 12-13: Replace wrapper with `<Container>`
- Line 89: Remove `</div>`
- Line 90: Replace `</main>` with `</Container>`

---

### Example 3: documental.astro (lines 10-77)

**Same pattern as biografia.astro** - straightforward replacement.

---

### Example 4: preambul/index.astro (lines 11-86)

**Same pattern** - straightforward replacement.

---

## Critical Files

### Files to Create:

1. `/src/components/ui/Container.astro` - New Container component

### Files to Modify (Phase 2):

**High Priority (confirmed pattern):**

1. `/src/pages/index.astro` (lines 10-33)
2. `/src/pages/biografia.astro` (lines 12-89)
3. `/src/pages/documental.astro` (lines 11-76)
4. `/src/pages/preambul/index.astro` (lines 12-85)

**Medium Priority (check first):** 5. `/src/pages/404.astro` 6. `/src/pages/reflexions/[...page].astro` 7. `/src/pages/reflexions/[category]/[...page].astro` 8. `/src/pages/reflexions/paraula-clau/[keyword]/[...page].astro` 9. `/src/pages/reflexions/[...slug].astro`

**Low Priority (might use layouts):** 10. `/src/pages/preambul/20.astro` 11. `/src/pages/preambul/40.astro` 12. `/src/pages/preambul/60.astro`

### Files to Check (might need Container in layout):

1. `/src/layouts/PostsListLayout.astro`
2. `/src/layouts/PreambulLayout.astro`

---

## Success Criteria

**Functional:**

- ✅ Container component renders with correct structure
- ✅ All wrapper types (main, div, section, article) work
- ✅ All size variants (default, wide, full) work correctly
- ✅ All spacing variants (default, compact, loose, none) work correctly
- ✅ Custom classes apply to inner container
- ✅ Slot content renders properly

**Visual:**

- ✅ Zero regressions on all migrated pages
- ✅ Consistent max-width across pages
- ✅ Consistent vertical padding across pages
- ✅ Responsive padding (px-6) works on mobile
- ✅ Centering (mx-auto) works correctly

**Code Quality:**

- ✅ TypeScript compilation succeeds
- ✅ No console errors or warnings
- ✅ Path aliases used consistently (`@components/ui/Container.astro`)
- ✅ Follows existing UI component patterns
- ✅ Clean props interface with proper typing
- ✅ Component is simple and focused

**Migration Impact:**

- ✅ At least 8 pages migrated successfully
- ✅ Reduced layout boilerplate by ~50%
- ✅ Centralized layout structure for easy maintenance
- ✅ Future layout changes only need 1 file update

---

## Design Decisions

### Why This Approach?

**Composition over Hardcoding:**

- Flexible `as` prop for semantic HTML
- Size and spacing variants cover common cases
- Custom classes for edge cases
- Simple, focused API

**Type Safety:**

- Element type literal union prevents invalid elements
- Size/spacing literal types ensure valid Tailwind classes
- Catches errors at compile time

**Follows Established Patterns:**

- Props destructuring matches other UI components
- Variant mapping follows Button/Link/Image conventions
- Default slot pattern consistent with Card/Heading/Text
- Class concatenation consistent with other components

**Reduces Duplication:**

- Layout structure defined once
- Consistent spacing applied automatically
- Easier maintenance (update 1 file instead of 8+)
- Prevents inconsistency bugs

**Maintains Flexibility:**

- Supports different semantic elements (main, article, section, div)
- Multiple size options for different content widths
- Spacing variants for different page types
- Custom classes for unique requirements

**Why Two Elements (Wrapper + Inner)?**

- Wrapper (`<main>`, etc.) provides:
  - Semantic HTML element
  - Flex grow for sticky footer
  - Vertical padding (pt/pb)
- Inner (`<div>`) provides:
  - Max-width constraint
  - Horizontal centering (mx-auto)
  - Horizontal padding (px-6)

This separation matches the existing pattern and allows independent control of outer vs inner styling.

---

## Future Enhancements (Out of Scope)

**After Container is stable, consider:**

1. **Stack Component** - Vertical spacing primitive (`space-y-*` patterns)
2. **Grid Component** - Responsive grid layouts with column variants
3. **Section Component** - Content dividers with border-t pattern
4. **Prose Component** - Typography-rich content wrapper
5. **Split Component** - Two-column layouts

**Container might evolve to support:**

- Background color variants (if pattern emerges)
- Border variants (if pattern emerges)
- Nested containers (if needed)
- Print-specific variants

---

## Key Implementation Notes

### Semantic HTML

The `as` prop enables proper semantic HTML:

- Use `<main>` for primary page content (default)
- Use `<article>` for standalone content (blog posts)
- Use `<section>` for thematic groupings
- Use `<div>` when semantic meaning isn't needed

### Responsive Behavior

- `px-6` provides consistent horizontal padding on all breakpoints
- `max-w-*` constrains width on large screens while staying full-width on mobile
- `mx-auto` centers content when below max-width
- No changes needed for responsive behavior

### Integration with Layout Components

If a layout component (like PostsListLayout) already provides the wrapper pattern:

- **Option A:** Add Container to the layout component
- **Option B:** Don't use Container on pages that use that layout
- **Decision:** Evaluate based on how many pages use each layout

### Class Merging

Custom classes via `class` prop are applied to the **inner container**, not the wrapper:

- Allows adding background colors, borders, etc. to content area
- Wrapper remains clean with just semantic element and spacing
- Matches expected behavior (most customization is on content area)

---

## Testing Checklist

**Component Creation:**

- [ ] TypeScript compiles without errors
- [ ] All size variants render correctly
- [ ] All spacing variants render correctly
- [ ] All wrapper elements (as prop) work
- [ ] Custom classes apply to inner container
- [ ] Default slot renders content

**Migration Testing (for each page):**

- [ ] Page renders without errors
- [ ] Layout matches original (no visual regressions)
- [ ] Vertical spacing matches (pt-32 pb-16)
- [ ] Max-width constraint matches (max-w-4xl)
- [ ] Horizontal padding works (px-6)
- [ ] Centering works (mx-auto)
- [ ] Responsive behavior unchanged
- [ ] Semantic HTML preserved

**Cross-Browser Testing:**

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

**Responsive Testing:**

- [ ] Mobile (< 640px)
- [ ] Tablet (640px - 1024px)
- [ ] Desktop (> 1024px)

---

## Rollback Plan

If issues arise during migration:

1. **Single Page Issue:**

   - Revert that page's changes
   - Restore original `<main>` wrapper pattern
   - Investigate issue before continuing

2. **Component Issue:**

   - Fix Container component
   - Re-test all migrated pages
   - Continue migration once stable

3. **Full Rollback:**
   - Git revert commits
   - Remove Container component
   - Re-evaluate approach

**Risk Mitigation:**

- Migrate pages one at a time
- Test each page after migration
- Commit after each successful migration
- Keep PRs small and focused

---

## Documentation Updates

After implementation:

1. Update COMPONENT_ARCHITECTURE.md with Container component
2. Add Container to component list in README (if exists)
3. Document Container usage in component guide (if exists)
4. Update future enhancement sections in other docs (mark Container as complete)
5. Consider creating example templates using Container

---

## Estimated Impact

**Code Reduction:**

- Before: ~4 lines per page (2 opening tags, 2 closing tags)
- After: ~2 lines per page (1 opening tag, 1 closing tag)
- **Savings:** ~16 lines across 8 pages, ~50% reduction

**Maintenance:**

- Layout changes: 1 file instead of 8+ files
- Consistency: Guaranteed by component
- Readability: Clearer intent with semantic component name

**Developer Experience:**

- New pages: Copy 1 line instead of remembering wrapper pattern
- Variants: Change prop instead of modifying classes
- Semantic: Use `as` prop for correct HTML element
