// Margin Notes positioning logic (progressive enhancement)

const MARGIN_NOTES_BREAKPOINT = 1088;

// `> margin:` blockquotes are converted to anchors exactly once, regardless of
// viewport, so the literal "margin:" prefix is never shown to readers. On narrow
// viewports the CSS renders these anchors inline; on wide ones MarginNotes
// positions them in the rail.
let blockquotesConverted = false;

function convertMarginBlockquotesToAnchors(): void {
  const blockquotes = document.querySelectorAll('.post-body blockquote, .recipe-body blockquote');
  blockquotes.forEach((blockquote) => {
    const firstP = blockquote.querySelector('p:first-child');
    if (!firstP || !firstP.textContent) return;
    const raw = firstP.textContent.trim();
    if (!/^margin:/i.test(raw)) return;
    const noteText = raw.replace(/^margin:\s*/i, '').trim();
    const anchor = document.createElement('span');
    anchor.className = 'note-anchor';
    anchor.textContent = '';
    anchor.setAttribute('data-note', noteText);
    blockquote.parentElement?.insertBefore(anchor, blockquote);
    blockquote.remove();
  });
}

class MarginNotes {
  private anchors: NodeListOf<HTMLElement>;
  private notesContainer: HTMLElement | null;
  private notes: HTMLElement[] = [];
  private onResize?: () => void;
  private onLoad?: () => void;
  private timeout?: number;

  constructor() {
    this.anchors = document.querySelectorAll('.note-anchor');
    this.notesContainer = document.getElementById('notesContainer');
    if (!this.anchors.length || !this.notesContainer) return;
    this.init();
  }

  private init(): void {
    this.createNotes();
    this.positionNotesContainer();
    this.positionNotes();
    this.setupEventListeners();
  }

  private createNotes(): void {
    this.anchors.forEach((anchor, index) => {
      const noteElement = document.createElement('div');
      noteElement.className = 'margin-note';
      noteElement.textContent = anchor.dataset.note || '';
      noteElement.setAttribute('data-anchor-index', String(index));
      this.notesContainer?.appendChild(noteElement);
      this.notes.push(noteElement);
    });
  }

  private positionNotesContainer(): void {
    const pageContainer =
      (document.querySelector('.post-body.prose') as HTMLElement) ||
      (document.querySelector('.recipe-body.prose') as HTMLElement) ||
      (document.querySelector('.layout-prose') as HTMLElement) ||
      (document.querySelector('.container') as HTMLElement);
    const wrapper = document.querySelector('.main-content');
    if (!pageContainer || !wrapper || !this.notesContainer) return;
    const contentRect = pageContainer.getBoundingClientRect();
    const wrapperRect = (wrapper as HTMLElement).getBoundingClientRect();
    const gap = 28; // matches --margin-note-gap
    const leftPosition = contentRect.right - wrapperRect.left + gap;
    // Ensure notes don't overflow right edge of wrapper
    const notesWidth = this.notesContainer.offsetWidth || 240;
    const maxLeft = wrapperRect.width - notesWidth - gap;
    this.notesContainer.style.left = Math.min(leftPosition, maxLeft) + 'px';
  }

  private positionNotes(): void {
    const wrapper = document.querySelector('.main-content');
    if (!wrapper) return;
    const wrapperRect = (wrapper as HTMLElement).getBoundingClientRect();
    const used: { top: number; height: number }[] = [];
    this.anchors.forEach((anchor, index) => {
      const anchorRect = anchor.getBoundingClientRect();
      const note = this.notes[index];
      if (!note) return;
      const height = this.getNoteHeight(note);
      let top = anchorRect.top - wrapperRect.top;
      top = this.avoidCollisions(top, used, height);
      used.push({ top, height });
      note.style.top = top + 'px';
      setTimeout(() => {
        note.classList.add('visible');
        note.style.opacity = '1';
        note.style.transform = 'translateY(0)';
      }, index * 60);
    });
  }

  private getNoteHeight(note: HTMLElement): number {
    const od = note.style.display;
    const ov = note.style.visibility;
    const op = note.style.position;
    const ot = note.style.top;
    note.style.display = 'block';
    note.style.visibility = 'hidden';
    note.style.position = 'absolute';
    note.style.top = '0px';
    const h = note.offsetHeight;
    note.style.display = od;
    note.style.visibility = ov;
    note.style.position = op;
    note.style.top = ot;
    return h;
  }

  private avoidCollisions(
    desiredTop: number,
    used: { top: number; height: number }[],
    height: number
  ): number {
    let adjusted = desiredTop;
    const minGap = 24;
    const sorted = used.slice().sort((a, b) => a.top - b.top);
    for (const u of sorted) {
      if (adjusted < u.top + u.height + minGap && adjusted + height + minGap > u.top) {
        adjusted = u.top + u.height + minGap;
      }
    }
    return adjusted;
  }

  private setupEventListeners(): void {
    this.onResize = () => {
      if (this.timeout) window.clearTimeout(this.timeout);
      this.timeout = window.setTimeout(() => {
        this.positionNotesContainer();
        this.positionNotes();
      }, 200);
    };
    this.onLoad = () => this.refresh();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('load', this.onLoad);
  }

  public refresh(): void {
    this.positionNotesContainer();
    this.positionNotes();
  }

  public destroy(): void {
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.onLoad) window.removeEventListener('load', this.onLoad);
    if (this.timeout) window.clearTimeout(this.timeout);
    this.onResize = undefined;
    this.onLoad = undefined;
    this.timeout = undefined;

    // Clean up DOM elements
    this.notes.forEach((note) => note.remove());
    this.notes = [];

    // Reset global state if re-initialization is needed
    window.__mnotes_inited = false;
    marginNotesInstance = null;
  }
}

declare global {
  interface Window {
    __mnotes_inited?: boolean;
  }
}

export { MarginNotes };
export let marginNotesInstance: MarginNotes | null = null;

let initResizeObserver: ResizeObserver | null = null;
let initResizeHandler: (() => void) | null = null;

function cleanupInitListeners(): void {
  if (initResizeObserver) {
    initResizeObserver.disconnect();
    initResizeObserver = null;
  }
  if (initResizeHandler) {
    window.removeEventListener('resize', initResizeHandler);
    initResizeHandler = null;
  }
}

export function initMarginNotes(): void {
  const tryInit = () => {
    // Always convert margin blockquotes, even on narrow viewports, so the
    // note text is shown inline via CSS instead of as a raw "margin:" blockquote.
    if (!blockquotesConverted) {
      convertMarginBlockquotesToAnchors();
      blockquotesConverted = true;
    }

    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent || mainContent.offsetWidth < MARGIN_NOTES_BREAKPOINT) return;
    if (window.__mnotes_inited) return;

    const anchors = document.querySelectorAll('.note-anchor');
    const container = document.getElementById('notesContainer');
    if (!anchors.length || !container) return;
    marginNotesInstance = new MarginNotes();
    window.__mnotes_inited = true;
    cleanupInitListeners();
  };

  document.addEventListener('DOMContentLoaded', () => {
    tryInit();
    setTimeout(tryInit, 0);
  });
  window.addEventListener('load', tryInit);

  if ('ResizeObserver' in window) {
    initResizeObserver = new ResizeObserver(() => {
      if (window.__mnotes_inited) return;
      setTimeout(tryInit, 50);
    });
    const mainContent = document.querySelector('.main-content');
    if (mainContent) initResizeObserver.observe(mainContent);
  }

  initResizeHandler = () => {
    if (!window.__mnotes_inited) setTimeout(tryInit, 50);
  };
  window.addEventListener('resize', initResizeHandler);
}

// Auto-initialize
initMarginNotes();
