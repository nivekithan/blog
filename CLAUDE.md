# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AstroPaper blog theme - a minimal, responsive, and SEO-friendly Astro blog template. The codebase uses:

- **Astro** as the main framework with TypeScript
- **TailwindCSS v4** for styling 
- **Pagefind** for static search functionality
- **Content Collections** for type-safe markdown blog posts
- **Dynamic OG image generation** using Satori and @resvg/resvg-js

## Development Commands

All commands use `pnpm` as the package manager:

```bash
# Start development server (localhost:4321)
pnpm run dev

# Build for production (includes Astro check, build, and Pagefind indexing)
pnpm run build

# Preview production build
pnpm run preview

# Type checking and linting
astro check           # TypeScript checking
pnpm run lint         # ESLint
pnpm run format       # Prettier formatting
pnpm run format:check # Check formatting without changes

# Generate TypeScript types for Astro modules
pnpm run sync
```

## Architecture

### Content Structure
- **Blog posts**: All markdown files in `src/data/blog/` (supports subdirectories)
- **Content schema**: Defined in `src/content.config.ts` with Zod validation
- **Collections**: Uses Astro's glob loader to process markdown files
- **URL patterns**: Subdirectories affect URLs unless prefixed with `_`

### Key Directories
- `src/components/`: Reusable Astro components
- `src/layouts/`: Page layout templates
- `src/pages/`: File-based routing (Astro pages)
- `src/utils/`: Utility functions for posts, OG images, and data processing
- `src/styles/`: Global CSS and typography styles
- `public/`: Static assets and auto-generated Pagefind search index

### Configuration
- **Site config**: `src/config.ts` - main site settings (author, title, URLs, etc.)
- **Astro config**: `astro.config.ts` - framework configuration including Shiki syntax highlighting
- **Content types**: `src/content.config.ts` - blog post schema definition

### Blog Post Schema
Posts require frontmatter with:
- `title`, `description`, `pubDatetime` (required)
- `author` (defaults to site author), `tags` (defaults to ["others"])
- Optional: `featured`, `draft`, `ogImage`, `modDatetime`, `canonicalURL`, `timezone`

### Build Process
The build command chains multiple operations:
1. `astro check` - TypeScript validation
2. `astro build` - Generate static site
3. `pagefind --site dist` - Create search index
4. Copy Pagefind assets to public directory

### OG Image Generation
- Dynamic OG images generated using Satori and RESVG
- Templates in `src/utils/og-templates/`
- Controlled by `SITE.dynamicOgImage` setting
- Performance consideration: ~1 second per image (affects build time)

## Theme Configuration

### Core Site Settings (`src/config.ts`)
Key configuration options in the `SITE` object:
- **Display settings**: `postPerIndex` (4), `postPerPage` (4), `scheduledPostMargin` (15 min)
- **Feature toggles**: `lightAndDarkMode`, `showArchives`, `showBackButton`, `dynamicOgImage`
- **Edit integration**: `editPost.url` for GitHub edit links
- **Internationalization**: `dir` (ltr/rtl/auto), `lang`, `timezone` (IANA format)

### Social Links (`src/constants.ts`)
- **SOCIALS array**: Configure social media links (name, href, linkTitle, icon)
- **SHARE_LINKS**: Configure post sharing options

## Customization Guide

### Logo/Branding (`src/components/Header.astro`)
- **Text**: Update `SITE.title` in config.ts
- **SVG**: Import from `srgh repo clone nivekithan/blogc/assets/` and replace `{SITE.title}` in Header.astro
- **Image**: Use Astro's Image component for PNG/JPG logos

### Color Schemes (`src/styles/global.css`)
CSS custom properties for theming:
- **Variables**: `--background`, `--foreground`, `--accent`, `--muted`, `--border`
- **Light theme**: `:root, html[data-theme="light"]` selector
- **Dark theme**: `html[data-theme="dark"]` selector
- **Single theme**: Set primary scheme in `public/toggle-theme.js`

### Layout Width (`src/styles/global.css`)
- **Default**: `max-w-3xl` (768px)
- **Customize**: Update `max-w-app` utility class

## Special Features

### LaTeX Support
1. Install: `pnpm install rehype-katex remark-math katex`
2. Configure in `astro.config.ts`: Add `remarkMath` and `rehypeKatex` plugins
3. Import KaTeX CSS in `Layout.astro`
4. Add Katex text color in `typography.css`

### Giscus Comments Integration
- **Prerequisites**: Public repo, Giscus app installed, Discussions enabled
- **Implementation**: Add script tag in `PostDetails.astro` or React component
- **Theme switching**: Advanced setup supports light/dark mode

### Git Hooks for Auto-Dating
- **Husky integration**: Automatically update `pubDatetime` and `modDatetime`
- **Workflow**: Set `draft: "first"` for initial publish, hooks handle date updates

## Development Workflows

### Blog Post Creation
- **Location**: `src/data/blog/` (supports subdirectories)
- **URL mapping**: Subdirectories affect URLs unless prefixed with `_`
- **Table of contents**: Add `## Table of contents` heading where desired
- **Images**: Store in `src/assets/` (optimized) or `public/` (manual optimization)

### Syntax Highlighting (Shiki)
- **Themes**: `min-light` (light), `night-owl` (dark)
- **Features**: File names, line highlighting, diff notation via transformers
- **Configuration**: In `astro.config.ts` markdown.shikiConfig

### Dependency Updates
- **Tool**: Use `npm-check-updates` for systematic updates
- **Strategy**: Patch → Minor → Major with testing between each level