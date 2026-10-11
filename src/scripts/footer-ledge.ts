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

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      lantern?.classList.add('is-fluttering');
      if (!snail) return;
      // At the far end the snail starts over from the left, without crawling back.
      const wrap = progress + SNAIL_STEP > 1;
      progress = wrap ? 0 : progress + SNAIL_STEP;
      rememberSnail(progress);
      snail.classList.toggle('is-crawling', !wrap);
      placeSnail();
    },
    { threshold: 0.4 }
  );
  observer.observe(ledge);
}

init();
