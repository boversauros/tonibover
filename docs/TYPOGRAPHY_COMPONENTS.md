# Implementation Plan: Typography UI Components & Semantic Token Migration

## Overview

Create reusable Heading and Text UI components following the established component architecture, and migrate all pages to use semantic tokens consistently.

## Goals

1. Create `Heading.astro` component with size and semantic variants
2. Create `Text.astro` component for body text, captions, and labels
3. Refactor all pages to use new typography components
4. Fix semantic token violations (`text-gray-*` → semantic tokens)
5. Maintain zero visual regressions

---

## Component Specifications

### 1. Heading Component (`/src/components/ui/Heading.astro`)

**Purpose:** Standardize heading styles with consistent typography and semantic color tokens

**Props:**
```typescript
interface Props {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  size?: 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  variant?: 'primary' | 'secondary' | 'body' | 'muted';
  italic?: boolean;
  class?: string;
}
```

**Size Mappings:**
- `xl`: `text-xl` (section titles)
- `2xl`: `text-2xl` (subsection titles)
- `3xl`: `text-3xl` (large headings)
- `4xl`: `text-4xl md:text-5xl` (page titles with responsive sizing)
- `5xl`: `text-5xl` (hero headings)

**Variant Colors (Semantic Tokens):**
- `primary`: `text-primary` (white)
- `secondary`: `text-secondary` (gray-200)
- `body`: `text-body` (gray-300)
- `muted`: `text-muted` (gray-400)

**Default Styling:**
- All headings: `font-serif`
- Size-based margins: `mb-2` for 4xl+, `mb-4` for 3xl, `mb-6` for 2xl, `mb-8` for xl

**Example Usage:**
```astro
<Heading as="h1" size="4xl" variant="primary">Antoni Bover Tanyà</Heading>
<Heading as="h2" size="xl" variant="secondary" italic>BIOGRAFIA</Heading>
<Heading as="h3" size="2xl" variant="primary">Formació Acadèmica</Heading>
```

---

### 2. SectionTitle Component (`/src/components/ui/SectionTitle.astro`)

**Purpose:** Specialized heading for page section titles (very common pattern)

This is a convenience wrapper around Heading with preset defaults:
- `as="h2"`
- `size="xl"`
- `variant="secondary"`
- `italic={true}`
- `class="mb-8"`

**Props:**
```typescript
interface Props {
  class?: string;
}
```

**Example Usage:**
```astro
<SectionTitle>BIOGRAFIA</SectionTitle>
<SectionTitle>DOCUMENTAL</SectionTitle>
```

---

### 3. Text Component (`/src/components/ui/Text.astro`)

**Purpose:** Standardize text/paragraph styles with semantic tokens

**Props:**
```typescript
interface Props {
  as?: 'p' | 'span' | 'div';
  variant?: 'body' | 'caption' | 'small' | 'muted' | 'label';
  italic?: boolean;
  serif?: boolean;
  class?: string;
}
```

**Variant Styles:**
- `body`: `text-base leading-relaxed text-body` (default paragraph text)
- `caption`: `text-sm text-muted font-serif italic` (image captions)
- `small`: `text-sm text-muted` (small metadata text)
- `muted`: `text-muted` (subdued text)
- `label`: `text-sm tracking-wider text-muted` (form labels, metadata)

**Example Usage:**
```astro
<Text variant="body">Main paragraph content here...</Text>
<Text variant="caption">Image caption text</Text>
<Text variant="label">IMAGE MANAGER</Text>
```

---

## Implementation Steps

### Phase 1: Create UI Components

**Step 1.1: Create Heading Component**
- File: `/src/components/ui/Heading.astro`
- Implement size variants (xl, 2xl, 3xl, 4xl, 5xl)
- Implement color variants using semantic tokens
- Support `italic` prop
- Dynamic element rendering (`as` prop)
- Default `font-serif` styling

**Step 1.2: Create SectionTitle Component**
- File: `/src/components/ui/SectionTitle.astro`
- Wrapper around Heading with preset props
- Simplifies the very common section title pattern

**Step 1.3: Create Text Component**
- File: `/src/components/ui/Text.astro`
- Implement variant styles with semantic tokens
- Support `italic` and `serif` props
- Dynamic element rendering

**Testing:**
- Visually verify all variants match existing styles
- Test responsive sizing for `4xl` headings
- Verify semantic token colors render correctly

---

### Phase 2: Migrate Pages to New Components

#### Priority Order (based on semantic token violations):

1. **index.astro** (2 violations)
2. **documental.astro** (15+ violations)
3. **preambul/index.astro** (10+ violations)
4. **biografia.astro** (clean, but update headings)
5. **reflexions/[...slug].astro** (clean, but update headings)
6. **preambul/20.astro, 40.astro, 60.astro** (if they have violations)

**For Each Page:**

1. Import new components at top of file
2. Replace heading patterns:
   - `<h2 class="text-xl font-serif italic mb-8 text-gray-200">` → `<SectionTitle>`
   - `<h1 class="text-4xl font-serif text-primary mb-2">` → `<Heading as="h1" size="4xl" variant="primary">`
   - `<h3 class="text-2xl text-primary mb-6">` → `<Heading as="h3" size="2xl" variant="primary">`
3. Replace text patterns:
   - `<p class="text-sm text-gray-400 ...">` → `<Text variant="small">`
   - `<figcaption class="text-sm text-muted font-serif italic">` → `<Text variant="caption">`
4. Fix semantic token violations in remaining elements
5. Test page to ensure visual consistency

---

## Semantic Token Fixes

### Files with Critical Violations:

**src/pages/index.astro:**
- Line 9: `text-gray-200` → `text-secondary`
- Line 17: `text-gray-400` → `text-muted`
- Line 19: `text-gray-300` → `text-body`

**src/pages/documental.astro:**
- Lines 10, 16, 20, 24, 27, 30, 33, 36, 39, 47, 48, 62, 63: `text-gray-*` → semantic equivalents
- Line 15: `border-gray-800` → `border-default`

**src/pages/preambul/index.astro:**
- Lines 10, 17, 31-33, 48-52, 67-69: `text-gray-*` → semantic equivalents

**src/components/app/PreambulNavigation.astro:**
- Line 18: `border-gray-800/50` → `border-default` with opacity variant
- Lines 24, 40, 50: `text-gray-*` → semantic tokens

### Semantic Token Reference:

| Old Class | New Semantic Token |
|-----------|-------------------|
| `text-gray-200` | `text-secondary` |
| `text-gray-300` | `text-body` |
| `text-gray-400` | `text-muted` |
| `text-gray-500` | `text-subtle` |
| `text-white` | `text-primary` |
| `border-gray-800` | `border-default` |

---

## Critical Files

### Files to Create:
1. `/src/components/ui/Heading.astro`
2. `/src/components/ui/SectionTitle.astro`
3. `/src/components/ui/Text.astro`

### Files to Modify (Priority Order):

**High Priority (Semantic Token Violations):**
1. `/src/pages/index.astro` - Add imports, replace headings, fix 3 token violations
2. `/src/pages/documental.astro` - Add imports, replace headings, fix 15+ token violations
3. `/src/pages/preambul/index.astro` - Add imports, replace headings, fix 10+ token violations
4. `/src/components/app/PreambulNavigation.astro` - Fix token violations

**Medium Priority (Clean but need component migration):**
5. `/src/pages/biografia.astro` - Replace heading patterns with components
6. `/src/pages/reflexions/[...slug].astro` - Replace heading patterns with components
7. `/src/pages/preambul/20.astro` - Update if violations exist
8. `/src/pages/preambul/40.astro` - Update if violations exist
9. `/src/pages/preambul/60.astro` - Update if violations exist

### Files to Update (Import Paths):
- Update all modified files to use: `import Heading from '@components/ui/Heading.astro'`
- Update all modified files to use: `import Text from '@components/ui/Text.astro'`
- Update all modified files to use: `import SectionTitle from '@components/ui/SectionTitle.astro'`

---

## Success Criteria

- ✅ Heading, SectionTitle, and Text components created in `/ui/`
- ✅ All pages migrated to use new typography components
- ✅ Zero semantic token violations (`text-gray-*` fully replaced)
- ✅ No visual regressions - all pages look identical to before
- ✅ All imports use path aliases (`@components/ui/...`)
- ✅ TypeScript types defined properly
- ✅ Build passes successfully

---

## Future Enhancements (Out of Scope)

After completing typography components, next priorities:
1. Image component with aspect ratios and hover effects
2. Card component for PostGrid and Preambul patterns
3. Container/Section layout components
4. Grid component with responsive columns
5. Icon component to reduce SVG duplication
