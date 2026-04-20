'use client';

/**
 * DEPRECATED SHIM.
 *
 * The app's top chrome is now rendered once at the root layout via
 * `GlobalNav` (which wraps `TopNav` from the design system). Three
 * rooms: The Workbook · The Family Manual · The Archive.
 *
 * This file used to render a four-item nav (The Journal · The
 * Manual · What's New · Rituals). P0.1 of the flows audit unified
 * on the three-room taxonomy and deleted the four-item variant.
 *
 * We keep the module as a null-render shim so existing `<Navigation />`
 * invocations across 11 pages don't break while we sweep imports.
 * Safe to delete once those call sites are cleaned up.
 */
export default function Navigation() {
  return null;
}
