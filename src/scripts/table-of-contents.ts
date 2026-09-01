/**
 * Table of Contents component
 * Provides collapsible TOC with active section highlighting
 */
import { bootstrapComponent } from './client-bootstrap';

interface Heading {
  level: number;
  text: string;
  id: string;
}

function initSingleToc(container: HTMLElement, proseContent: HTMLElement): (() => void) | void {
  const tocToggle = container.querySelector('.toc-toggle') as HTMLButtonElement | null;
  const tocContent = container.querySelector('.toc-content') as HTMLElement | null;
  const tocList = container.querySelector('.toc-list') as HTMLOListElement | null;

  if (!tocToggle || !tocContent || !tocList) return;

  const maxDepth = parseInt(container.dataset.maxDepth || '3', 10);

  container.removeAttribute('hidden');
  tocContent.setAttribute('aria-expanded', 'false');
  tocList.replaceChildren();

  const headings = Array.from(proseContent.querySelectorAll('h2, h3, h4')) as HTMLHeadingElement[];
  const filteredHeadings = headings.filter((h) => parseInt(h.tagName[1]) <= maxDepth);

  if (filteredHeadings.length < 2) {
    container.setAttribute('hidden', '');
    return;
  }

  filteredHeadings.forEach((h, i) => {
    if (!h.id) {
      h.id = `heading-${i}`;
    }
  });

  const headingData: Heading[] = filteredHeadings.map((h) => ({
    level: parseInt(h.tagName[1]),
    text: h.textContent || '',
    id: h.id,
  }));

  headingData.forEach((h) => {
    const li = document.createElement('li');
    li.className = 'toc-item';
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.className = `toc-link toc-h${h.level}`;
    a.dataset.target = h.id;
    a.textContent = h.text;
    li.appendChild(a);
    tocList.appendChild(li);
  });

  let isExpanded = false;
  const activeById = new Map<string, number>();
  let observer: IntersectionObserver | null = null;

  function toggle(): void {
    isExpanded = !isExpanded;
    tocToggle!.setAttribute('aria-expanded', String(isExpanded));
    tocContent!.setAttribute('aria-expanded', String(isExpanded));
  }

  tocToggle.addEventListener('click', toggle);

  function handleTocClick(e: MouseEvent): void {
    const link = (e.target as HTMLElement).closest('.toc-link') as HTMLAnchorElement | null;
    if (!link) return;

    e.preventDefault();
    const targetId = link.getAttribute('data-target');
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    const offset = 80;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });

    if (window.innerWidth < 1200 && isExpanded) {
      toggle();
    }
  }

  tocList.addEventListener('click', handleTocClick);

  function setActiveById(id: string | null): void {
    tocList!.querySelectorAll('.toc-link.active').forEach((link) => {
      link.classList.remove('active');
    });

    if (!id) return;
    const link = Array.from(tocList!.querySelectorAll('.toc-link')).find(
      (tocLink) => (tocLink as HTMLElement).dataset.target === id
    ) as HTMLElement | undefined;
    if (link) link.classList.add('active');
  }

  function resolveActiveHeading(): string | null {
    if (!activeById.size) {
      return headingData[0]?.id ?? null;
    }

    let winnerId: string | null = null;
    let winnerTop = Number.POSITIVE_INFINITY;
    for (const [id, top] of activeById) {
      if (top < winnerTop) {
        winnerTop = top;
        winnerId = id;
      }
    }
    return winnerId;
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const id = target.id;
          if (!id) continue;

          if (entry.isIntersecting) {
            activeById.set(id, entry.boundingClientRect.top);
          } else {
            activeById.delete(id);
          }
        }

        setActiveById(resolveActiveHeading());
      },
      {
        root: null,
        rootMargin: '-110px 0px -60% 0px',
        threshold: [0, 1],
      }
    );

    for (const h of headingData) {
      const heading = document.getElementById(h.id);
      if (heading) observer.observe(heading);
    }
  } else {
    setActiveById(headingData[0]?.id ?? null);
  }

  function handleOutsideClick(e: MouseEvent): void {
    if (!tocToggle!.contains(e.target as Node) && !tocContent!.contains(e.target as Node)) {
      if (isExpanded) {
        toggle();
      }
    }
  }

  document.addEventListener('click', handleOutsideClick);

  return () => {
    tocToggle!.removeEventListener('click', toggle);
    tocList!.removeEventListener('click', handleTocClick);
    document.removeEventListener('click', handleOutsideClick);
    observer?.disconnect();
  };
}

function initTableOfContents(): void | (() => void) {
  const tocContainers = document.querySelectorAll('.toc-container, .inline-toc');
  if (tocContainers.length === 0) return;

  const proseContent = (document.querySelector('#post-body') ||
    document.querySelector('#note-body') ||
    document.querySelector('#recipe-body')) as HTMLElement | null;

  if (!proseContent) return;

  const cleanupFns: Array<() => void> = [];

  tocContainers.forEach((container) => {
    const cleanup = initSingleToc(container as HTMLElement, proseContent);
    if (cleanup) cleanupFns.push(cleanup);
  });

  if (cleanupFns.length === 0) return;

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

bootstrapComponent('table-of-contents', initTableOfContents);
