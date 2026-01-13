# Implementation Plan: Reusable UI Component Architecture

## Overview

Create a foundational component library with Button and Link primitives, reorganize components into a clear architecture (/ui, /composed, /app), and refactor CategoryNav to demonstrate the new pattern while standardizing all styles to semantic tokens.

## Goals

1. ✅ Create Button and Link primitive components
2. ✅ Establish /ui, /composed, /app directory structure
3. ✅ Refactor CategoryNav as demonstration
4. ✅ Standardize all styles to semantic tokens (text-gray-\* → text-muted, etc.)
5. ✅ Maintain visual consistency (zero regressions)

---

## Directory Structure

### New Organization

```
/src/components/
├── ui/                    # Reusable primitives
│   ├── Button.astro       # Button with ghost & icon variants
│   └── Link.astro         # Link with 4 variants + active state
├── composed/              # Components using primitives
│   ├── CategoryNav.astro  # Refactored to use Link
│   ├── KeywordsList.astro # (future: use Link)
│   └── PaginationControl.astro # (future: use Link)
└── app/                   # Feature-specific components
    ├── Navigation.astro   # (future: use Link + Button)
    ├── PostGrid.astro
    ├── Carousel.astro     # (future: use Button)
    └── PreambulNavigation.astro
```

---

## Component Specifications

### 1. Link Component (`/src/components/ui/Link.astro`)

**Purpose:** Standardize all link patterns with consistent hover states and semantic tokens

**Props:**

```typescript
interface Props {
  href: string;
  variant?: 'primary' | 'muted' | 'secondary' | 'accent-border';
  active?: boolean;
  class?: string;
  'aria-label'?: string;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
}
```

**Variants:**

| Variant                           | Base Style                               | Hover Style                               | Usage               |
| --------------------------------- | ---------------------------------------- | ----------------------------------------- | ------------------- |
| `primary`                         | `text-body`                              | `hover:text-primary`                      | Navigation links    |
| `muted` (default for CategoryNav) | `text-muted`                             | `hover:text-primary`                      | Filters, pagination |
| `secondary`                       | `text-primary-60`                        | `hover:text-primary`                      | Carousel labels     |
| `accent-border`                   | `text-muted border-b border-transparent` | `hover:text-primary hover:border-primary` | Keywords            |

**Active State:**

- When `active={true}`: adds `border-b-2 border-primary text-primary`
- Used in CategoryNav and PaginationControl

**Key Features:**

- All variants use `transition-colors-default` (300ms)
- Supports custom classes via `class` prop
- ARIA attributes for accessibility
- Slot for link content

---

### 2. Button Component (`/src/components/ui/Button.astro`)

**Purpose:** Standardize button patterns for navigation toggles and icon buttons

**Props:**

```typescript
interface Props {
  variant?: 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'icon';
  class?: string;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  'aria-expanded'?: 'true' | 'false';
  [key: string]: any; // Allows data-* attributes
}
```

**Variants:**

| Variant | Style                                                                   | Usage                        |
| ------- | ----------------------------------------------------------------------- | ---------------------------- |
| `ghost` | `px-4 py-2 tracking-wide text-body hover:bg-surface hover:text-primary` | Mobile menu items            |
| `icon`  | `p-2 hover:text-primary` with auto `h-8 w-8` size                       | Menu toggle, carousel arrows |

**Key Features:**

- Default `type="button"` (prevents accidental form submission)
- Supports `data-*` attributes (e.g., `data-menu-button`)
- Icon variant auto-applies icon sizing
- Slot for button content (text, SVG, etc.)

---

## Refactoring Example: CategoryNav

### Current Implementation (`/src/components/CategoryNav.astro`)

**Issues:**

- Inline conditional classes: `` `hover:text-primary ${cat.id === activeCategory ? 'border-b-2...' : ''}` ``
- Mixed styling logic in template
- Active state handling verbose

**Lines 18-22:**

```astro
<a
  href={`/reflexions/${cat.id}`}
  class={`hover:text-primary transition-colors-default ${
    cat.id === activeCategory ? 'border-b-2 border-primary text-primary' : ''
  }`}></a>
```

### New Implementation (`/src/components/composed/CategoryNav.astro`)

**After refactoring:**

```astro
---
import Link from '../ui/Link.astro';

interface Props {
  categories: Array<{ id: string; name: string }>;
  activeCategory?: string;
}

const { categories, activeCategory } = Astro.props;
---

<nav class="mb-12">
  <ul class="flex flex-wrap gap-6 text-muted">
    <li>
      <Link href="/reflexions" variant="muted" active={!activeCategory}> Tots </Link>
    </li>
    {
      categories.map((cat) => (
        <li>
          <Link href={`/reflexions/${cat.id}`} variant="muted" active={cat.id === activeCategory}>
            {cat.name}
          </Link>
        </li>
      ))
    }
  </ul>
</nav>
```

**Benefits:**

- ✅ 70% reduction in inline class logic
- ✅ Active state simplified to boolean prop
- ✅ All styling delegated to Link component
- ✅ More maintainable and testable

---

## Implementation Steps

### Phase 1: Create UI Primitives

**Step 1.1: Create Link Component**

- File: `/src/components/ui/Link.astro`
- Implement 4 variants (primary, muted, secondary, accent-border)
- Add active state handling
- Support ARIA attributes
- Use semantic tokens throughout

**Step 1.2: Create Button Component**

- File: `/src/components/ui/Button.astro`
- Implement 2 variants (ghost, icon)
- Support data-\* attributes
- Default type="button"

**Testing:**

- Create `/src/pages/test-ui.astro` to test all variants visually
- Verify hover states
- Check active states
- Test ARIA attributes

### Phase 2: Refactor CategoryNav

**Step 2.1: Move and Refactor**

- Create: `/src/components/composed/CategoryNav.astro`
- Import Link component
- Replace all `<a>` tags with `<Link>` components
- Use `variant="muted"` for all links
- Simplify active state to boolean props

**Step 2.2: Update Imports**

- Update `/src/layouts/PostsListLayout.astro`:
  ```astro
  import CategoryNav from '../components/composed/CategoryNav.astro';
  ```

**Step 2.3: Clean Up**

- Delete old `/src/components/CategoryNav.astro`
- Verify all pages work correctly

**Testing:**

- Navigate to `/reflexions` page
- Verify all categories display
- Test active state highlighting
- Check hover effects
- Test on mobile/desktop

### Phase 3: Organize Remaining Components

**Step 3.1: Create App Directory**

- Create `/src/components/app/`
- Move existing components:
  - `Navigation.astro` → `/app/`
  - `PostGrid.astro` → `/app/`
  - `Carousel.astro` → `/app/`
  - `PreambulNavigation.astro` → `/app/`
  - `KeywordsList.astro` → `/composed/`
  - `PaginationControl.astro` → `/composed/`

**Step 3.2: Update All Imports**

- Search for all component imports in `/src/layouts/` and `/src/pages/`
- Update to new paths
- Test each page after updating

---

## Semantic Token Standardization

### Conversions to Make

| Old Class         | New Semantic Token |
| ----------------- | ------------------ |
| `text-gray-200`   | `text-secondary`   |
| `text-gray-300`   | `text-body`        |
| `text-gray-400`   | `text-muted`       |
| `text-gray-500`   | `text-subtle`      |
| `text-white`      | `text-primary`     |
| `text-yellow-500` | `text-accent`      |
| `border-gray-800` | `border-default`   |
| `bg-gray-900`     | `bg-surface`       |

**Note:** This will be handled automatically by using the Link and Button components, which use semantic tokens exclusively.

---

## Critical Files

### Files to Create

1. `/src/components/ui/Link.astro` - Link primitive
2. `/src/components/ui/Button.astro` - Button primitive
3. `/src/components/composed/CategoryNav.astro` - Refactored CategoryNav
4. `/src/pages/test-ui.astro` - Visual testing page (optional)

### Files to Modify

1. `/src/layouts/PostsListLayout.astro` - Update CategoryNav import (line 2-3)

### Files to Move

1. `/src/components/CategoryNav.astro` → `/src/components/composed/CategoryNav.astro` (then refactor)
2. `/src/components/Navigation.astro` → `/src/components/app/Navigation.astro`
3. `/src/components/PostGrid.astro` → `/src/components/app/PostGrid.astro`
4. `/src/components/Carousel.astro` → `/src/components/app/Carousel.astro`
5. `/src/components/PreambulNavigation.astro` → `/src/components/app/PreambulNavigation.astro`
6. `/src/components/KeywordsList.astro` → `/src/components/composed/KeywordsList.astro`
7. `/src/components/PaginationControl.astro` → `/src/components/composed/PaginationControl.astro`

### Files to Update (imports)

Search and update imports in:

- `/src/layouts/Layout.astro` - Navigation import
- `/src/layouts/PostsListLayout.astro` - CategoryNav import
- `/src/layouts/PreambulLayout.astro` - PreambulNavigation import
- Any page files importing components

---

## Success Criteria

- ✅ Button and Link components created in `/ui/`
- ✅ CategoryNav refactored and moved to `/composed/`
- ✅ All components organized into `/ui/`, `/composed/`, `/app/`
- ✅ All imports updated across layouts and pages
- ✅ No visual regressions on any page
- ✅ All hover/active states work correctly
- ✅ Semantic tokens used consistently
- ✅ TypeScript types defined properly

---

## Future Enhancements (Out of Scope)

- Refactor KeywordsList to use Link component
- Refactor PaginationControl to use Link component
- Refactor Navigation to use Link + Button components
- Refactor Carousel to use Button component
- Create Text and Heading primitives
- Create Container and Stack layout primitives
