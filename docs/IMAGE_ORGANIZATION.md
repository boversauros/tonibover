# Image Organization Strategy

## Overview

This document outlines the recommended image organization structure for the main website pages. Note that reflexions post images are managed through a CMS and don't need to be organized in this repository.

## Directory Structure

```
public/
└── images/                       # All main website images
    ├── inici_img.webp           # Homepage hero image
    ├── biografia-1957-01.webp   # Biografia carousel images
    ├── biografia-1957-02.webp
    ├── biografia-2020-01.webp
    ├── biografia-2020-02.webp
    ├── preambul-20-01.webp       # Preambul section images
    ├── preambul-20-02.webp
    ├── preambul-40-01.webp
    ├── preambul-40-02.webp
    ├── preambul-60-01.webp
    ├── preambul-60-02.webp
    └── ...                      # Other main website images as needed
```

## Rationale

### Why `public/images/`?

1. **Direct URL Access**: Images in `public/` are served directly at the root URL path (e.g., `/images/inici_img.webp`)
2. **No Build Processing**: Images referenced by URL strings don't need Astro's build-time processing
3. **Simple References**: Easy to reference in components: `/images/inici_img.webp`
4. **Flat Structure**: Simple, flat organization makes it easy to find and manage images without deep nesting

### Why Flat Structure?

1. **Simplicity**: All main website images in one place - easy to find and manage
2. **Clear Naming**: Descriptive filenames (e.g., `biografia-1957-01.webp`) make purpose clear
3. **No Over-Engineering**: Main website has limited images, so subfolders add unnecessary complexity
4. **Easy Maintenance**: Single directory to check for all main website assets

## Usage Examples

**Homepage (`src/pages/index.astro`):**
```astro
<Image
  src="/images/inici_img.webp"
  alt="Artistic Photography"
  aspect="auto"
  loading="eager"
>
```

**Biografia Carousel (`src/components/app/Carousel.astro`):**
```astro
<Image
  src="/images/biografia-1957-01.webp"
  alt="Family photo from 1957"
  aspect="square"
/>
```

**Preambul Pages (`src/pages/preambul/20.astro`):**
```astro
const images = [
  {
    src: '/images/preambul-20-01.webp',
    alt: 'Self portrait with camera',
    caption: 'Fotografia: Pere Formiguera, Toni Bover i Manel Botet',
  },
  {
    src: '/images/preambul-20-02.webp',
    alt: 'Photographer working with camera',
    caption: "Els 20 simbolitzen l'etapa de la il·lusió...",
  },
];
```

**Note**: Reflexions post images are managed through a CMS and referenced via URLs provided by the CMS.

## Migration Strategy

### Current State
- Images are using placeholder URLs (`https://picsum.photos/...`)
- One image exists: `src/assets/inici_img.webp`

### Migration Steps

1. **Create Directory**
   ```bash
   mkdir -p public/images
   ```

2. **Move Existing Assets**
   - Move `src/assets/inici_img.webp` → `public/images/inici_img.webp`

3. **Update References**
   - Update `src/pages/index.astro` to use `/images/inici_img.webp`
   - Update preambul pages to use proper paths (e.g., `/images/preambul-20-01.webp`)
   - Update carousel component to use proper paths (e.g., `/images/biografia-1957-01.webp`)

4. **Add New Images**
   - Place all main website images directly in `public/images/`
   - Use descriptive filenames following the pattern: `{section}-{identifier}.webp`

## Image Naming Conventions

### Main Website Images
- **Format**: `{section}-{identifier}.webp` or descriptive names
- **Examples**: 
  - `inici_img.webp` (homepage hero)
  - `biografia-1957-01.webp`, `biografia-2020-01.webp` (biografia carousel)
  - `preambul-20-01.webp`, `preambul-40-01.webp` (preambul sections)
  - `documental-poster.webp` (if needed for documental page)

### Naming Guidelines
- Use lowercase with hyphens for readability
- Prefix with section name for easy identification
- Use descriptive identifiers (dates, numbers, or descriptive terms)
- Keep filenames concise but meaningful

## Image Optimization Recommendations

1. **Format**: Use `.webp` for modern browsers (with fallbacks if needed)
2. **Sizing**: 
   - Hero images: Optimize for large displays (e.g., 1200-1600px width)
   - Carousel/thumbnail images: Smaller sizes (e.g., 600-800px width)
   - Preambul images: Medium sizes (e.g., 800-1000px width)
3. **Compression**: Use tools like `sharp` or online tools to optimize file sizes
4. **Responsive Images**: Consider using `srcset` for different screen sizes if needed

## Alternative: Using `src/assets/` for Processed Images

If you need Astro's image optimization features (resizing, format conversion), you can:

1. Keep source images in `src/assets/`
2. Import them in components: `import heroImage from '@assets/inici_img.webp'`
3. Use Astro's `<Image />` component for optimization

**Trade-off**: This requires changing from URL strings to imports, which means updating components to use imports instead of URL paths.

## Recommendation

**Use `public/images/`** because:
- Simple URL references work well for static website images
- Easy to add/update images without code changes
- No build-time processing needed
- Direct URL access is straightforward and performant
