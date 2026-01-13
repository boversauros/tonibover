# Implementation Plan: Icon UI Component

## Overview

Create a reusable Icon component to consolidate 8 duplicated SVG instances across Navigation, Carousel, and PreambulNavigation components. The component follows established UI component patterns (Button, Link, Image) with type-safe props and automatic variant detection.

## Goals

1. Create Icon component (`/src/components/ui/Icon.astro`) with 6 icon variants
2. Reduce SVG duplication from ~12 lines per icon to 1 line
3. Support outline and solid icon styles with auto-detection
4. Migrate 3 components to use Icon component
5. Maintain zero visual regressions

---

## Component Design

### Icon Component (`/src/components/ui/Icon.astro`)

**Props Interface:**

```typescript
interface Props {
  name: 'menu' | 'close' | 'chevron-left' | 'chevron-right' | 'arrow-left' | 'arrow-right';
  size?: '4' | '5' | '6' | '8' | '10' | '12'; // Default: '6'
  variant?: 'outline' | 'solid'; // Default: auto-detected from icon
  class?: string;
  'aria-hidden'?: 'true' | 'false'; // Default: 'true'
  [key: string]: any; // Pass-through attributes (id, data-*, etc.)
}
```

**Icon Definitions:**

```typescript
const icons = {
  menu: {
    variant: 'outline',
    viewBox: '0 0 24 24',
    path: 'M4 6h16M4 12h16M4 18h16',
  },
  close: {
    variant: 'outline',
    viewBox: '0 0 24 24',
    path: 'M6 18L18 6M6 6l12 12',
  },
  'chevron-left': {
    variant: 'outline',
    viewBox: '0 0 24 24',
    path: 'M15 19l-7-7 7-7',
  },
  'chevron-right': {
    variant: 'outline',
    viewBox: '0 0 24 24',
    path: 'M9 5l7 7-7 7',
  },
  'arrow-left': {
    variant: 'solid',
    viewBox: '0 0 20 20',
    path: 'M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z',
  },
  'arrow-right': {
    variant: 'solid',
    viewBox: '0 0 20 20',
    path: 'M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L15.586 11H3a1 1 0 110-2h12.586l-5.293-5.293a1 1 0 010-1.414z',
  },
};
```

**Implementation:**

```astro
---
import type { HTMLAttributes } from 'astro/types';

interface Props {
  name: 'menu' | 'close' | 'chevron-left' | 'chevron-right' | 'arrow-left' | 'arrow-right';
  size?: '4' | '5' | '6' | '8' | '10' | '12';
  variant?: 'outline' | 'solid';
  class?: string;
  'aria-hidden'?: 'true' | 'false';
  [key: string]: any;
}

const {
  name,
  size = '6',
  variant,
  class: className = '',
  'aria-hidden': ariaHidden = 'true',
  ...rest
} = Astro.props;

// Icon definitions
const icons = {
  menu: {
    variant: 'outline',
    viewBox: '0 0 24 24',
    path: 'M4 6h16M4 12h16M4 18h16',
  },
  close: {
    variant: 'outline',
    viewBox: '0 0 24 24',
    path: 'M6 18L18 6M6 6l12 12',
  },
  'chevron-left': {
    variant: 'outline',
    viewBox: '0 0 24 24',
    path: 'M15 19l-7-7 7-7',
  },
  'chevron-right': {
    variant: 'outline',
    viewBox: '0 0 24 24',
    path: 'M9 5l7 7-7 7',
  },
  'arrow-left': {
    variant: 'solid',
    viewBox: '0 0 20 20',
    path: 'M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z',
  },
  'arrow-right': {
    variant: 'solid',
    viewBox: '0 0 20 20',
    path: 'M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L15.586 11H3a1 1 0 110-2h12.586l-5.293-5.293a1 1 0 010-1.414z',
  },
};

const icon = icons[name];
const finalVariant = variant || icon.variant;

const sizeClasses = {
  '4': 'h-4 w-4',
  '5': 'h-5 w-5',
  '6': 'h-6 w-6',
  '8': 'h-8 w-8',
  '10': 'h-10 w-10',
  '12': 'h-12 w-12',
};

const finalClasses = `${sizeClasses[size]} ${className}`.trim();

// SVG attributes based on variant
const svgAttrs =
  finalVariant === 'outline'
    ? {
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
      }
    : {
        fill: 'currentColor',
      };

const pathAttrs =
  finalVariant === 'outline'
    ? {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }
    : {
        'fill-rule': 'evenodd',
        'clip-rule': 'evenodd',
      };
---

<svg
  xmlns="http://www.w3.org/2000/svg"
  class={finalClasses}
  viewBox={icon.viewBox}
  aria-hidden={ariaHidden}
  {...svgAttrs}
  {...rest}
>
  <path d={icon.path} {...pathAttrs}></path>
</svg>
```

---

## Implementation Steps

### Phase 1: Create Icon Component

**Step 1: Create `/src/components/ui/Icon.astro`**

- Define TypeScript Props interface with icon name enum
- Add icon definitions object with path data
- Implement size mapping (4, 5, 6, 8, 10, 12)
- Add variant auto-detection logic
- Apply appropriate SVG attributes based on variant (outline vs solid)
- Support custom classes and pass-through attributes

**Verification:**

- TypeScript compiles without errors
- All 6 icons defined correctly
- Size classes map to Tailwind utilities
- Variant detection works for outline and solid

---

### Phase 2: Migrate Navigation Component

**Step 2.1: Update `/src/components/app/Navigation.astro`**

**Changes (lines 45-72):**

1. Add import: `import Icon from '@components/ui/Icon.astro';`
2. Replace hamburger menu SVG (lines 45-58) with:
   ```astro
   <Icon name="menu" size="6" id="menuIcon" />
   ```
3. Replace close X SVG (lines 59-72) with:
   ```astro
   <Icon name="close" size="6" id="closeIcon" class="hidden" />
   ```

**Step 2.2: Test Navigation**

- Navigate to any page with navigation
- Verify menu icon displays correctly
- Click menu button, verify close icon shows
- Check icon inherits correct color (currentColor)
- Test responsive behavior

---

### Phase 3: Migrate Carousel Component

**Step 3.1: Update `/src/components/app/Carousel.astro`**

**Changes:**

1. Add import: `import Icon from '@components/ui/Icon.astro';`
2. Replace previous arrow SVG (lines 80-89) with:
   ```astro
   <Icon name="chevron-left" size="8" />
   ```
3. Replace next arrow SVG (lines 97-106) with:
   ```astro
   <Icon name="chevron-right" size="8" />
   ```

**Step 3.2: Test Carousel**

- Navigate to home page (carousel section)
- Verify both arrow icons display
- Test navigation buttons work
- Check hover states on buttons
- Verify icon size is correct (h-8 w-8)

---

### Phase 4: Migrate PreambulNavigation Component

**Step 4.1: Update `/src/components/app/PreambulNavigation.astro`**

**Changes:**

1. Add import: `import Icon from '@components/ui/Icon.astro';`
2. Replace previous arrow SVG (lines 26-37) with:
   ```astro
   <Icon
     name="arrow-left"
     size="5"
     class="mr-2 transform group-hover:-translate-x-1 transition-transform"
   />
   ```
3. Replace next arrow SVG (lines 56-67) with:
   ```astro
   <Icon
     name="arrow-right"
     size="5"
     class="ml-2 transform group-hover:translate-x-1 transition-transform"
   />
   ```

**Step 4.2: Test PreambulNavigation**

- Navigate to any Preambul detail page (/preambul/20, /preambul/40, /preambul/60)
- Verify both navigation arrows display
- Test hover animations (arrow slides on hover)
- Verify links navigate correctly
- Check icon fills are solid (not outline)

---

### Phase 5: Final Verification

**Visual Regression Testing:**

- Compare before/after of Navigation menu icons
- Compare before/after of Carousel arrows
- Compare before/after of PreambulNavigation arrows
- Verify all sizes match original (h-5, h-6, h-8)
- Verify all colors use currentColor correctly

**Functional Testing:**

- All buttons with icons remain clickable
- Hover states work correctly
- Icons inherit parent text color
- Custom classes apply properly (transforms, spacing)
- Pass-through attributes work (id, data-\*)

**Code Quality:**

- No console errors
- TypeScript compiles successfully
- All imports use path aliases (`@components/ui/Icon.astro`)
- No unused imports
- Build succeeds

---

## Critical Files

### Files to Create:

1. `/src/components/ui/Icon.astro` - New Icon component

### Files to Modify:

1. `/src/components/app/Navigation.astro` (lines 45-72)

   - Add Icon import
   - Replace 2 SVG instances with Icon component

2. `/src/components/app/Carousel.astro` (lines 80-106)

   - Add Icon import
   - Replace 2 SVG instances with Icon component

3. `/src/components/app/PreambulNavigation.astro` (lines 26-67)
   - Add Icon import
   - Replace 2 SVG instances with Icon component

### Files to Reference:

1. `/src/components/ui/Button.astro` - Component pattern reference
2. `/src/components/ui/Link.astro` - Variant mapping pattern

---

## Design Decisions

**Icon Name Enum:**

- Type safety prevents typos
- IDE autocomplete for available icons
- Self-documenting which icons exist
- Follows Button/Link variant pattern

**Auto-Variant Detection:**

- Simplifies API - users don't need to specify outline vs solid
- Each icon has a natural variant (chevron=outline, arrow=solid)
- Override available for edge cases
- Reduces cognitive load

**CurrentColor Usage:**

- Icons inherit parent text color automatically
- Works seamlessly with semantic tokens
- Hover effects work without extra configuration
- Follows existing SVG pattern in codebase

**Size as String Numbers:**

- Matches Tailwind convention (h-6 = size "6")
- Clear intent and direct mapping
- Easy to extend with new sizes
- Type-safe with literal union

**Pass-Through Attributes:**

- Supports `id` for JavaScript targeting (menu toggle)
- Supports `data-*` attributes if needed
- Maintains flexibility for edge cases
- Follows Button component pattern

---

## Success Criteria

**Functional:**

- Icon component renders all 6 icon variants correctly
- Size prop works for all 6 size options
- Variant auto-detection selects correct style (outline/solid)
- Custom classes via `class` prop apply correctly
- Pass-through attributes work (id, data-\*)
- TypeScript types prevent invalid icon names

**Visual:**

- Zero regressions on Navigation menu icons
- Zero regressions on Carousel arrow icons
- Zero regressions on PreambulNavigation arrow icons
- All icons use currentColor correctly
- Hover effects and animations preserved
- Icon sizes match original (h-5, h-6, h-8)

**Code Quality:**

- TypeScript compilation succeeds
- No console errors or warnings
- Path aliases used consistently
- Follows existing UI component patterns (Button, Link, Image)
- Clean props interface with proper typing
- Icon definitions well-structured and maintainable

**Migration Impact:**

- 8 SVG instances reduced to 8 Icon components
- ~96 lines of SVG markup reduced to ~8 lines
- Easier to add new icons in the future
- Centralized icon definitions for consistency

---

## Why This Approach?

**Composition over Configuration:**

- Simple, focused API with smart defaults
- Easy to use for common cases
- Flexible for edge cases via `class` prop

**Type Safety:**

- Icon name enum prevents typos
- Size literal types ensure valid Tailwind classes
- Catches errors at compile time

**Follows Established Patterns:**

- Props destructuring matches Button/Link/Image
- Variant mapping follows existing conventions
- Class concatenation consistent with other components

**Reduces Duplication:**

- 6 unique SVG paths stored once
- Consistent attributes applied automatically
- Easier maintenance and updates

**Future-Proof:**

- Easy to add new icon names
- Easy to add new sizes
- Supports customization via class prop
- Pass-through attributes for flexibility
