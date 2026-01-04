# Fonts Directory

This directory should contain the following font files:

## Required Fonts

1. **GeistVF.woff** - Geist Sans Variable Font
2. **GeistMonoVF.woff** - Geist Mono Variable Font

## How to Obtain

You can download the Geist font family from:
- https://vercel.com/font
- Or via npm: `npm install geist`

After downloading, place the `.woff` files in this directory.

## Alternative Setup

If you prefer not to use local fonts, modify `layout.tsx` to use Google Fonts or system fonts instead:

```tsx
// Option 1: Use Inter from Google Fonts
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

// Option 2: Use system fonts (modify tailwind.config.ts)
fontFamily: {
  sans: ['system-ui', '-apple-system', 'sans-serif'],
}
```





