function wrapProseTables(root: ParentNode): void {
  root.querySelectorAll<HTMLTableElement>('.prose table').forEach((table) => {
    const parent = table.parentElement;
    if (!parent || parent.classList.contains('table-wrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

function initTableOverflowWrappers(): void {
  wrapProseTables(document);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTableOverflowWrappers, { once: true });
} else {
  initTableOverflowWrappers();
}

document.addEventListener('astro:page-load', initTableOverflowWrappers);
