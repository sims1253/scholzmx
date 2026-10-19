// Tag filtering and search coordination for index pages (blog, recipes).
// Entries are `.nc-item` elements with a comma-separated `data-tags`; groups that end up
// empty are hidden with them. While a search query is typed, the index steps aside for
// Pagefind's results.

function initIndexFinder(finder: HTMLElement): void {
  const noun = finder.dataset.noun ?? 'entries';
  const status = finder.querySelector<HTMLElement>('[data-filter-status]');
  const tagPanel = finder.querySelector<HTMLDetailsElement>('details');
  let activeTag = new URLSearchParams(location.search).get('tag') ?? '';
  let searching = false;

  function apply(): void {
    for (const entry of document.querySelectorAll<HTMLElement>('.nc-item')) {
      const tags = (entry.dataset.tags ?? '').split(',').filter(Boolean);
      const visible = !searching && (!activeTag || tags.includes(activeTag));
      entry.style.display = visible ? '' : 'none';
    }

    for (const group of document.querySelectorAll<HTMLElement>('[data-index-group]')) {
      const entries = group.querySelectorAll<HTMLElement>('.nc-item');
      group.hidden = ![...entries].some((entry) => entry.style.display !== 'none');
    }

    for (const button of finder.querySelectorAll<HTMLButtonElement>('[data-filter-tag]')) {
      button.setAttribute('aria-pressed', String(button.dataset.filterTag === activeTag));
    }

    if (status) {
      status.textContent = activeTag && !searching ? `Showing ${noun} tagged ${activeTag}.` : '';
    }
    if (tagPanel && activeTag) tagPanel.open = true;
  }

  finder.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-filter-tag]');
    if (!button) return;

    const tag = button.dataset.filterTag ?? '';
    activeTag = tag === activeTag ? '' : tag;

    const url = new URL(location.href);
    if (activeTag) url.searchParams.set('tag', activeTag);
    else url.searchParams.delete('tag');
    history.replaceState(null, '', url);
    apply();
  });

  // Pagefind renders its input later, so listen at the document.
  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (!input.classList.contains('pagefind-ui__search-input')) return;
    searching = input.value.trim() !== '';
    apply();
  });

  // Pagefind's clear button empties the field without an input event.
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('.pagefind-ui__search-clear')) return;
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.pagefind-ui__search-input');
      searching = Boolean(input?.value.trim());
      apply();
    });
  });

  apply();
}

const finder = document.querySelector<HTMLElement>('[data-index-finder]');
if (finder) initIndexFinder(finder);
