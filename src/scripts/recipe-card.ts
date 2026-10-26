// Recipe cards: scaling, table or steps, and a cooking mode that walks through the steps.
// Everything reads from the server-rendered card, so the page works without this script.
import { formatAmount } from '../lib/recipe';

interface Timer {
  stage: number;
  label: string;
  start: number;
  end: number;
  done: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
// Saving the step is a convenience: with storage blocked, cooking carries on unsaved.
const remember = <T>(use: () => T): T | undefined => {
  try {
    return use();
  } catch {
    return undefined;
  }
};
const clock = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const rest = `${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  return hours ? `${hours}:${rest}` : rest;
};

// Text as shown: hidden alternatives (the doubled gear list) are left out, and list items
// read as one sentence: "squash: cut into cubes; butter: softened."
const textOf = (element: Element | null | undefined) => {
  if (!element) return '';
  const copy = element.cloneNode(true);
  if (!(copy instanceof Element)) return '';
  for (const hidden of copy.querySelectorAll('[hidden]')) hidden.remove();
  for (const item of copy.querySelectorAll('li')) {
    item.append(item.nextElementSibling ? '; ' : '.');
  }
  return (copy.textContent ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s([;.])/g, '$1')
    .trim();
};

function initRecipeCard(card: HTMLElement): void {
  const controls = card.querySelector<HTMLElement>('[data-rc-controls]');
  const bar = card.querySelector<HTMLElement>('[data-rc-cook]');
  const inner = card.querySelector<HTMLElement>('[data-rc-cook-inner]');
  const sheet = card.querySelector<HTMLElement>('.rc-sheet');
  const frame = card.querySelector<HTMLElement>('[data-rc-frame]');
  const wrap = card.querySelector<HTMLElement>('.rc-table-wrap');
  const stages = [...card.querySelectorAll<HTMLElement>('.rc-steps-item')];
  const cells = [...card.querySelectorAll<HTMLElement>('.rc-table [data-stage]')];
  const rows = [...card.querySelectorAll<HTMLElement>('tr[data-taken-at]')];
  if (!controls || !bar || !inner || !sheet || stages.length === 0) return;
  controls.hidden = false;
  const gathering = card.querySelector('.rc-corner[data-stage]') !== null;

  const part = <T extends HTMLElement>(selector: string) => bar.querySelector<T>(selector);
  const count = part('[data-rc-count]');
  const title = part('[data-rc-do]');
  const uses = part('[data-rc-uses]');
  const detail = part('[data-rc-detail]');
  const meanwhile = part('[data-rc-meanwhile]');
  const timerButton = part<HTMLButtonElement>('[data-rc-timer]');
  const countdown = part('[data-rc-countdown]');
  const countdownTime = part('[data-rc-countdown-time]');
  const timerList = part('[data-rc-timers]');
  const announce = part('[data-rc-announce]');
  const back = part<HTMLButtonElement>('[data-rc-back]');
  const next = part<HTMLButtonElement>('[data-rc-next]');
  const storageKey = `recipe-step:${location.pathname}`;

  // ===== Scaling and view =====

  const scale = (factor: number) => {
    for (const quantity of card.querySelectorAll<HTMLElement>('.rc-qty[data-amount]')) {
      if (quantity.dataset.fixed !== undefined) continue;
      const amount = Number(quantity.dataset.amount) * factor;
      quantity.textContent = formatAmount(amount, quantity.dataset.unit);
    }
    for (const doubled of card.querySelectorAll<HTMLElement>('[data-show-doubled]')) {
      doubled.hidden = factor !== 2;
    }
    for (const written of card.querySelectorAll<HTMLElement>('[data-hide-doubled]')) {
      written.hidden = factor === 2;
    }
  };

  // While part of the table hides to the right, the frame fades its edge and says so.
  const showMore = () => {
    if (!frame || !wrap) return;
    frame.classList.toggle('has-more', wrap.scrollWidth - wrap.clientWidth - wrap.scrollLeft > 2);
  };
  wrap?.addEventListener('scroll', showMore, { passive: true });
  if (wrap) new ResizeObserver(showMore).observe(wrap);

  const setView = (view: string) => {
    card.dataset.view = view;
    const radio = card.querySelector<HTMLInputElement>(`input[name="rc-view"][value="${view}"]`);
    if (radio) radio.checked = true;
    showMore();
  };
  setView('steps');

  card.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === 'rc-scale') scale(Number(input.value));
    if (input.name === 'rc-view') {
      setView(input.value);
      if (current >= 0) show(current);
    }
  });

  // ===== Cooking =====

  let current = -1;
  let wakeLock: WakeLockSentinel | null = null;
  let audio: AudioContext | null = null;
  const timers: Timer[] = [];
  const chips = new Map<number, HTMLButtonElement>();
  let ticking = 0;

  const keepAwake = async () => {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      // Not every browser lets a page keep the screen on; cooking works without it.
    }
  };

  const chime = () => {
    if (!audio) return;
    const now = audio.currentTime;
    for (const [offset, frequency] of [
      [0, 660],
      [0.22, 880],
      [0.44, 660],
    ]) {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.6);
      tone.connect(gain).connect(audio.destination);
      tone.start(now + offset);
      tone.stop(now + offset + 0.65);
    }
    navigator.vibrate?.([200, 100, 200]);
  };

  const say = (message: string) => {
    if (announce) announce.textContent = message;
  };

  // The bar lines up with the card on wide screens, and the page keeps room for it.
  const placeBar = () => {
    if (current < 0) return;
    const wide = matchMedia('(min-width: 48rem)').matches;
    const rect = sheet.getBoundingClientRect();
    inner.style.marginLeft = wide ? `${rect.left - 1}px` : '';
    inner.style.width = wide ? `${rect.width + 2}px` : '';
    document.documentElement.style.setProperty('--rc-bar', `${bar.offsetHeight}px`);
  };
  new ResizeObserver(placeBar).observe(bar);
  window.addEventListener('resize', placeBar);

  const renderTimers = () => {
    const now = Date.now();
    const own = timers.find((timer) => timer.stage === current);
    const minutes = Number(stages[current]?.dataset.minutes ?? 0);
    if (timerButton) {
      timerButton.hidden = minutes === 0 || Boolean(own);
      timerButton.textContent = `Start ${minutes}-minute timer`;
    }
    if (countdown && countdownTime) {
      countdown.hidden = !own;
      if (own) countdownTime.textContent = own.done ? 'Done' : clock(own.end - now);
    }
    const progress = own ? Math.min(1, (now - own.start) / (own.end - own.start)) : 0;
    inner.style.setProperty('--rc-progress', String(progress));

    // Timers for other steps are chips; tapping one goes back to its step.
    for (const [stage, chip] of chips) {
      if (stage === current || !timers.some((timer) => timer.stage === stage)) {
        chip.parentElement?.remove();
        chips.delete(stage);
      }
    }
    for (const timer of timers) {
      if (timer.stage === current) continue;
      let chip = chips.get(timer.stage);
      if (!chip) {
        chip = document.createElement('button');
        chip.type = 'button';
        chip.addEventListener('click', () => show(timer.stage));
        const item = document.createElement('li');
        item.append(chip);
        timerList?.append(item);
        chips.set(timer.stage, chip);
      }
      chip.classList.toggle('is-done', timer.done);
      chip.textContent = `${timer.label} ${timer.done ? 'done' : clock(timer.end - now)}`;
    }
  };

  const tick = () => {
    const now = Date.now();
    for (const timer of timers) {
      if (!timer.done && timer.end <= now) {
        timer.done = true;
        chime();
        say(`Time's up: ${timer.label}.`);
      }
    }
    renderTimers();
    if (timers.every((timer) => timer.done)) {
      clearInterval(ticking);
      ticking = 0;
    }
  };

  const startTimer = () => {
    const minutes = Number(stages[current]?.dataset.minutes ?? 0);
    if (!minutes) return;
    // Created on a click, so the browser allows it to play the chime later.
    audio ??= new AudioContext();
    const now = Date.now();
    timers.push({
      stage: current,
      label: textOf(stages[current]?.querySelector('.rc-steps-do')),
      start: now,
      end: now + minutes * 60_000,
      done: false,
    });
    if (!ticking) ticking = window.setInterval(tick, 1000);
    renderTimers();
    say(`${minutes}-minute timer started.`);
  };

  const show = (stage: number) => {
    current = Math.max(0, Math.min(stages.length - 1, stage));
    remember(() => sessionStorage.setItem(storageKey, String(current)));

    for (const item of [...stages, ...cells]) {
      const at = Number(item.dataset.stage);
      item.classList.toggle('is-current', at === current);
      item.classList.toggle('is-done', at < current);
    }
    // Getting ready is the ingredient column: everything to gather lights up.
    card.classList.toggle('is-gathering', gathering && current === 0);
    for (const row of rows) {
      const takenAt = Number(row.dataset.takenAt);
      row.classList.toggle('is-current', takenAt === current);
      row.classList.toggle('is-used', takenAt < current);
    }

    // Finished timers for steps you've moved past are put away.
    for (let index = timers.length - 1; index >= 0; index--) {
      const timer = timers[index];
      if (timer && timer.done && timer.stage < current) timers.splice(index, 1);
    }

    const item = stages[current];
    if (count) count.textContent = `Step ${current + 1} of ${stages.length}`;
    if (title) title.textContent = textOf(item?.querySelector('.rc-steps-do'));
    const list = item?.querySelector('.rc-uses');
    uses?.replaceChildren(...(list ? [list.cloneNode(true)] : []));
    if (detail) detail.textContent = textOf(item?.querySelector('.rc-steps-detail'));
    if (meanwhile) {
      const task = textOf(item?.querySelector('.rc-steps-meanwhile'));
      meanwhile.hidden = !task;
      meanwhile.textContent = task;
    }
    if (back) back.disabled = current === 0;
    if (next) next.textContent = current === stages.length - 1 ? 'Done' : 'Next';
    renderTimers();
    placeBar();

    const target =
      card.dataset.view === 'steps'
        ? item
        : cells.find((cell) => Number(cell.dataset.stage) === current);
    target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  };

  const start = (stage = 0) => {
    card.classList.add('is-cooking');
    document.documentElement.classList.add('rc-cooking');
    bar.hidden = false;
    void keepAwake();
    current = 0;
    placeBar();
    show(stage);
    next?.focus();
  };

  const stop = () => {
    card.classList.remove('is-cooking', 'is-gathering');
    document.documentElement.classList.remove('rc-cooking');
    document.documentElement.style.removeProperty('--rc-bar');
    bar.hidden = true;
    current = -1;
    remember(() => sessionStorage.removeItem(storageKey));
    for (const item of [...stages, ...cells, ...rows]) {
      item.classList.remove('is-current', 'is-done', 'is-used');
    }
    timers.length = 0;
    renderTimers();
    clearInterval(ticking);
    ticking = 0;
    void wakeLock?.release();
    wakeLock = null;
    card.querySelector<HTMLButtonElement>('[data-rc-start]')?.focus();
  };

  card.querySelector('[data-rc-start]')?.addEventListener('click', () => start());
  part('[data-rc-stop]')?.addEventListener('click', stop);
  back?.addEventListener('click', () => show(current - 1));
  next?.addEventListener('click', () =>
    current === stages.length - 1 ? stop() : show(current + 1)
  );
  timerButton?.addEventListener('click', startTimer);

  for (const cell of cells) {
    cell.addEventListener('click', () => {
      if (current >= 0) show(Number(cell.dataset.stage));
    });
  }

  document.addEventListener('keydown', (event) => {
    if (current < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    if (event.key === 'ArrowRight') show(current + 1);
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'Escape') stop();
  });

  // The screen lock is dropped whenever the tab is hidden; take it back on return.
  document.addEventListener('visibilitychange', () => {
    if (current >= 0 && document.visibilityState === 'visible') void keepAwake();
  });

  const saved = remember(() => sessionStorage.getItem(storageKey)) ?? null;
  if (saved !== null) start(Number(saved));
}

for (const card of document.querySelectorAll<HTMLElement>('[data-recipe-card]')) {
  initRecipeCard(card);
}
