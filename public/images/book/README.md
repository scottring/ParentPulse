# Journal Spread Asset Manifest

Required photographic assets for the bound-journal spread (Plan 2).
Components fall back to flat cream when assets are missing —
never fake textures with CSS gradients.

| Filename | Purpose | Recommended size | Notes |
|---|---|---|---|
| `cover.jpg` | Backdrop: open book photographed top-down | 2400 × 1600 | Soft daylight, neutral surface |
| `spine-leather.jpg` | Tileable leather texture for binding | 512 × 512 | Warm tan or oxblood, real grain |
| `paper-left.jpg` | Tileable aged paper, left page | 1200 × 1600 | Ivory/cream, subtle fiber |
| `paper-right.jpg` | Tileable aged paper, right page | 1200 × 1600 | Slight variation from left |
| `gutter-shadow.png` | Photographed gutter shadow strip, transparent PNG | 80 × 1200 | Real photo, not a gradient |
| `binding-thread.png` | (Optional) Sewn binding detail at gutter | 60 × 1200 | Adds warmth |

**Sources:** Curated stock from Unsplash/Adobe Stock filtered for physical-object realism, or one custom half-day shoot covering all six.

**Activation:** After placing assets in `/public/images/book/`, set `NEXT_PUBLIC_BOOK_ASSETS_PRESENT=1` in `.env.local`. The components will pick them up automatically.
