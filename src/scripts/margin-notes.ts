/**
 * Margin Notes positioning logic (progressive enhancement)
 */
const MARGIN_NOTES_BREAKPOINT = 1200;
const COLLISION_MIN_GAP = 24;

let marginNotesInstance: MarginNotes | null = null;

export function getMarginNotesInstance(): MarginNotes | null {
  return marginNotesInstance;
}

function convertMarginBlockquotesToAnchors(): void {
  const blockquotes = document.querySelectorAll(
    '[data-main-column] .post-body blockquote, [data-main-column] .recipe-body blockquote'
  );

  blockquotes.forEach((blockquote) => {
    const firstP = blockquote.querySelector('p:first-child');
    if (!firstP || !firstP.textContent) return;

    const raw = firstP.textContent.trim();
    if (!/^margin:/i.test(raw)) return;

    const noteText = raw.replace(/^margin:\s*/i, '').trim();
    if (!noteText) return;

    const anchor = document.createElement('span');
    anchor.className = 'note-anchor';
    anchor.textContent = '';
    anchor.setAttribute('data-note', noteText);
    blockquote.parentElement?.insertBefore(anchor, blockquote);
    blockquote.remove();
  });
}

class MarginNotes {
  private readingLayout: HTMLElement | null;
  private mainColumn: HTMLElement | null;
  private notesContainer: HTMLElement | null;
  private anchors: HTMLElement[] = [];
  private notes: HTMLElement[] = [];
  private onResize?: () => void;
  private onLoad?: () => void;
  private timeout?: number;
  private heightCache: Map<HTMLElement, number> = new Map();
  private ready = false;

  constructor() {
    this.readingLayout = document.querySelector('[data-reading-layout]') as HTMLElement | null;
    this.mainColumn =
      (this.readingLayout?.querySelector('[data-main-column]') as HTMLElement | null) ?? null;
    this.notesContainer =
      (this.readingLayout?.querySelector('[data-margin-notes-layer]') as HTMLElement | null) ??
      null;

    if (!this.readingLayout || !this.mainColumn || !this.notesContainer) {
      return;
    }

    this.anchors = Array.from(this.mainColumn.querySelectorAll<HTMLElement>('.note-anchor'));
    if (!this.anchors.length) {
      return;
    }

    this.init();
    this.ready = true;
  }

  public isReady(): boolean {
    return this.ready;
  }

  private init(): void {
    this.createNotes();
    this.positionNotes();
    this.setupEventListeners();
  }

  private createNotes(): void {
    if (!this.notesContainer) return;

    this.notesContainer.innerHTML = '';
    this.notes = [];

    this.anchors.forEach((anchor, index) => {
      const noteElement = document.createElement('div');
      noteElement.className = 'margin-note';
      noteElement.textContent = anchor.dataset.note || '';
      noteElement.setAttribute('data-anchor-index', String(index));
      this.notesContainer!.appendChild(noteElement);
      this.notes.push(noteElement);
    });
  }

  private positionNotes(): void {
    if (!this.readingLayout || !this.notesContainer) return;

    const layoutRect = this.readingLayout.getBoundingClientRect();
    const used: { top: number; height: number }[] = [];
    let maxBottom = 0;

    this.anchors.forEach((anchor, index) => {
      const anchorRect = anchor.getBoundingClientRect();
      const note = this.notes[index];
      if (!note) return;

      const height = this.getNoteHeight(note);
      const desiredTop = anchorRect.top - layoutRect.top;
      const top = this.avoidCollisions(desiredTop, used, height);

      used.push({ top, height });
      maxBottom = Math.max(maxBottom, top + height);

      note.style.top = `${top}px`;

      window.setTimeout(() => {
        note.classList.add('visible');
      }, index * 60);
    });

    this.notesContainer.style.minHeight = `${Math.ceil(maxBottom)}px`;
  }

  private getNoteHeight(note: HTMLElement): number {
    if (this.heightCache.has(note)) {
      return this.heightCache.get(note)!;
    }

    const clone = note.cloneNode(true) as HTMLElement;
    const containerWidth = this.notesContainer?.clientWidth || 240;

    clone.style.cssText = `
      position: absolute;
      visibility: hidden;
      top: -9999px;
      left: -9999px;
      width: ${containerWidth}px;
    `;

    document.body.appendChild(clone);
    const height = clone.offsetHeight;
    document.body.removeChild(clone);

    this.heightCache.set(note, height);
    return height;
  }

  private avoidCollisions(
    desiredTop: number,
    used: { top: number; height: number }[],
    height: number
  ): number {
    let adjusted = desiredTop;
    const sorted = used.slice().sort((a, b) => a.top - b.top);

    for (const existing of sorted) {
      const overlaps =
        adjusted < existing.top + existing.height + COLLISION_MIN_GAP &&
        adjusted + height + COLLISION_MIN_GAP > existing.top;

      if (overlaps) {
        adjusted = existing.top + existing.height + COLLISION_MIN_GAP;
      }
    }

    return adjusted;
  }

  private setupEventListeners(): void {
    this.onResize = () => {
      if (this.timeout) window.clearTimeout(this.timeout);
      this.timeout = window.setTimeout(() => {
        this.heightCache.clear();
        this.positionNotes();
      }, 150);
    };

    this.onLoad = () => this.refresh();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('load', this.onLoad);
  }

  public refresh(): void {
    this.heightCache.clear();
    this.positionNotes();
  }

  public destroy(): void {
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.onLoad) window.removeEventListener('load', this.onLoad);
    if (this.timeout) window.clearTimeout(this.timeout);

    this.notes.forEach((note) => note.remove());
    this.notes = [];
    this.heightCache.clear();

    marginNotesInstance = null;
  }
}

export { MarginNotes };

let initResizeObserver: ResizeObserver | null = null;
let initResizeHandler: (() => void) | null = null;
let initTimeoutId: number | null = null;

function cleanupInitListeners(): void {
  if (initResizeObserver) {
    initResizeObserver.disconnect();
    initResizeObserver = null;
  }

  if (initResizeHandler) {
    window.removeEventListener('resize', initResizeHandler);
    initResizeHandler = null;
  }

  if (initTimeoutId !== null) {
    window.clearTimeout(initTimeoutId);
    initTimeoutId = null;
  }
}

export function initMarginNotes(): void {
  const tryInit = () => {
    try {
      convertMarginBlockquotesToAnchors();

      if (window.innerWidth < MARGIN_NOTES_BREAKPOINT) return;

      if (marginNotesInstance) {
        marginNotesInstance.refresh();
        return;
      }

      const layer = document.querySelector('[data-margin-notes-layer]');
      const anchors = document.querySelectorAll('[data-main-column] .note-anchor');
      if (!layer || !anchors.length) return;

      const instance = new MarginNotes();
      if (!instance.isReady()) return;

      marginNotesInstance = instance;
      cleanupInitListeners();
    } catch (err) {
      console.warn('MarginNotes initialization failed:', err);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    tryInit();
    initTimeoutId = window.setTimeout(tryInit, 0);
  });

  window.addEventListener('load', tryInit);

  if ('ResizeObserver' in window) {
    initResizeObserver = new ResizeObserver(() => {
      if (marginNotesInstance) return;
      initTimeoutId = window.setTimeout(tryInit, 50);
    });

    const readingLayout = document.querySelector('[data-reading-layout]');
    if (readingLayout) initResizeObserver.observe(readingLayout);
  }

  initResizeHandler = () => {
    if (!marginNotesInstance) {
      initTimeoutId = window.setTimeout(tryInit, 50);
    }
  };
  window.addEventListener('resize', initResizeHandler);
}

try {
  initMarginNotes();
} catch (err) {
  console.warn('MarginNotes auto-init failed:', err);
}
