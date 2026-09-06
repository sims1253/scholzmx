/**
 * Pre-filter a Pagefind Component UI search instance to a single content type.
 *
 * Astro-pagefind v2 / Pagefind's Component UI has no declarative attribute for
 * pre-filtering (e.g. "only show blog posts"), so each search instance must be
 * configured programmatically via `window.PagefindComponents.configureInstance`.
 *
 * The component UI bundle loads asynchronously, so this retries briefly until
 * the global is available, then applies a default `filters` value that restricts
 * every search in that instance to the given type. Content is indexed with
 * `data-pagefind-filter="type:<type>"`, so filtering on `{ type }` matches.
 */
type PagefindComponents = {
  configureInstance?: (instance: string, config: Record<string, unknown>) => void;
};

export function configurePagefindFilter(instance: string, type: string): void {
  const apply = (retries = 20): void => {
    const pc = (window as unknown as { PagefindComponents?: PagefindComponents })
      .PagefindComponents;
    if (pc?.configureInstance) {
      pc.configureInstance(instance, { filters: { type } });
      return;
    }
    if (retries > 0) setTimeout(() => apply(retries - 1), 50);
  };
  apply();
}
