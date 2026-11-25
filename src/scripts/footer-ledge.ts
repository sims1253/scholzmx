// The ledge at the foot of every page (src/components/FooterLedge.astro): a stone to lift,
// a contraption to set going, a snail that crosses the footer over a visit, and by
// torchlight a moth that comes to the lantern. The drawings and their animations live in
// CSS; this only starts them, on a click or when the ledge scrolls into view.

const SNAIL_KEY = 'grotto-snail';
// How much of the ledge the snail covers each time the footer comes into view.
const SNAIL_STEP = 0.07;
// A sequence that is already running is left alone for this long.
const RUN_MS = 6500;

function replay(element: Element, className: string): void {
  element.classList.remove(className);
  // Flush styles between removing and adding the class, so the animations start over.
  void element.getBoundingClientRect();
  element.classList.add(className);
}

function readSnail(): number {
  try {
    const progress = Number(sessionStorage.getItem(SNAIL_KEY));
    return Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;
  } catch {
    return 0;
  }
}

function rememberSnail(progress: number): void {
  try {
    sessionStorage.setItem(SNAIL_KEY, String(progress));
  } catch {
    // Storage can be unavailable in private modes; the snail just starts over each page.
  }
}

function init(): void {
  const ledge = document.getElementById('footer-ledge');
  if (!ledge) return;

  // Without motion, each sequence is a still of its end state (base.css stops all
  // animation); the stone settles back by hand after a moment, the contraption stays done.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const started = new Map<Element, number>();
  for (const [selector, className, settles] of [
    ['.stone-button', 'is-lifted', true],
    ['.contraption-button', 'is-going', false],
  ] as const) {
    const button = ledge.querySelector(selector);
    if (!button) continue;
    button.addEventListener('click', () => {
      const now = Date.now();
      if (now - (started.get(button) ?? 0) < RUN_MS) return;
      started.set(button, now);
      replay(button, className);
      if (still && settles) setTimeout(() => button.classList.remove(className), 2500);
    });
  }

  const snail = ledge.querySelector<HTMLElement>('.snail');
  const lantern = ledge.querySelector<HTMLElement>('.lantern-spot');
  let progress = readSnail();

  const placeSnail = () => {
    if (!snail) return;
    const room =
      ledge.clientWidth - snail.offsetLeft - snail.offsetWidth - (lantern?.offsetWidth ?? 0) - 8;
    snail.style.setProperty('--snail-x', `${Math.max(room, 0) * progress}px`);
  };
  placeSnail();

  const arrive = () => {
    lantern?.classList.add('is-fluttering');
    if (!snail) return;
    // At the far end the snail starts over from the left, without crawling back.
    const wrap = progress + SNAIL_STEP > 1;
    progress = wrap ? 0 : progress + SNAIL_STEP;
    rememberSnail(progress);
    snail.classList.toggle('is-crawling', !wrap);
    placeSnail();
  };

  // The ledge has come into view when two fifths of it are in the window. A scroll
  // listener keeps watch and not an IntersectionObserver: while an observer is watching
  // anything at all, Chrome wakes the main thread on every frame of a running animation
  // to see whether the answer has changed, and the canopy's leaves at the top of the
  // page would stop being free. This measures once per scrolled frame and no more.
  let inView = false;
  let pending = false;
  const look = () => {
    pending = false;
    const { top, bottom, height } = ledge.getBoundingClientRect();
    const shown = Math.min(bottom, window.innerHeight) - Math.max(top, 0);
    const now = height > 0 && shown >= height * 0.4;
    if (now && !inView) arrive();
    inView = now;
  };
  const watch = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(look);
  };
  window.addEventListener('scroll', watch, { passive: true });
  window.addEventListener('resize', watch, { passive: true });
  watch();
}

init();
