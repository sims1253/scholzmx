// Margin Notes positioning logic (progressive enhancement)

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
      document.querySelector<HTMLElement>('.post-body.prose') ||
      document.querySelector<HTMLElement>('.recipe-body.prose') ||
      document.querySelector<HTMLElement>('.layout-prose') ||
      document.querySelector<HTMLElement>('.container');
    const wrapper = document.querySelector('.main-content');
    if (!pageContainer || !wrapper || !this.notesContainer) return;
    const contentRect = pageContainer.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
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
    const wrapperRect = wrapper.getBoundingClientRect();
    const used: { top: number; height: number }[] = [];
    this.anchors.forEach((anchor, index) => {
      const anchorRect = anchor.getBoundingClientRect();
      const note = this.notes[index];
      if (!note) return;
      let top = anchorRect.top - wrapperRect.top;
      top = this.avoidCollisions(top, used, note);
      used.push({ top, height: this.getNoteHeight(note) });
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
    note: HTMLElement
  ): number {
    let adjusted = desiredTop;
    const height = this.getNoteHeight(note);
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
    let timeout: number | undefined;
    const onResize = () => {
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        this.positionNotesContainer();
        this.positionNotes();
      }, 200);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('load', () => this.refresh());
  }

  public refresh(): void {
    this.positionNotesContainer();
    this.positionNotes();
  }
}

declare global {
  interface Window {
    __mnotes_inited?: boolean;
  }
}

export function initMarginNotes(): void {
  const tryInit = () => {
    const mainContent = document.querySelector<HTMLElement>('.main-content');
    if (mainContent && mainContent.offsetWidth < 1088) return; // ~68rem
    if (window.__mnotes_inited) return;

    // Ensure anchors exist by converting any Quarto-style margin notes first
    convertMarginBlockquotesToAnchors();
    const anchors = document.querySelectorAll('.note-anchor');
    const container = document.getElementById('notesContainer');
    if (!anchors.length || !container) return;
    new MarginNotes();
    window.__mnotes_inited = true;
  };

  document.addEventListener('DOMContentLoaded', () => {
    tryInit();
    setTimeout(tryInit, 0);
  });
  window.addEventListener('load', tryInit);

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => {
      if (window.__mnotes_inited) return;
      setTimeout(tryInit, 50);
    });
    const mainContent = document.querySelector('.main-content');
    if (mainContent) resizeObserver.observe(mainContent);
  }

  // Also listen for resize as fallback (works in all browsers)
  window.addEventListener('resize', () => {
    if (!window.__mnotes_inited) setTimeout(tryInit, 50);
  });
}

// Auto-initialize
initMarginNotes();
