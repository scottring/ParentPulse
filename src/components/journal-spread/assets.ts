// Asset constants for the journal spread.
//
// Real photography lives in `/public/images/book/`. Until the assets
// land, components MUST gracefully degrade to honest flat colors —
// never fake leather/paper with CSS gradients.
//
// Toggle BOOK_ASSETS_AVAILABLE by setting NEXT_PUBLIC_BOOK_ASSETS_PRESENT=1
// after sourcing assets. See public/images/book/README.md for the manifest.

export const BOOK_ASSETS_AVAILABLE =
  process.env.NEXT_PUBLIC_BOOK_ASSETS_PRESENT === '1';

export const BOOK_ASSETS = {
  cover: '/images/book/cover.jpg',
  spineLeather: '/images/book/spine-leather.jpg',
  paperLeft: '/images/book/paper-left.jpg',
  paperRight: '/images/book/paper-right.jpg',
  gutterShadow: '/images/book/gutter-shadow.png',
  bindingThread: '/images/book/binding-thread.png',
} as const;

export const FLAT_COLORS = {
  paper: '#f5ecd8',
  spineDark: '#3d2f1f',
  ink: '#2d2418',
  inkMuted: '#8a6f4a',
} as const;
