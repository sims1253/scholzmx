// Recipe cards: scaling, table or steps, the step picked in the table, and a cooking mode
// that walks through the steps.
// Everything reads from the server-rendered card, so the page works without this script.
import { formatAmount, formatYield, type RecipeTimer } from '../lib/recipe';

/** A step's running timer. It works through the step's stages, one after the other. */
interface Timer {
  stage: number;
  label: string;
  phases: RecipeTimer[];
  /** The stage of the timer that is running now. */
  phase: number;
  start: number;
  end: number;
  /** What the last finished stage asked for, e.g. "Turn the oven down to 200 °C". */
  cue: string;
  done: boolean;
}

const wide = matchMedia('(min-width: 48rem)');
const still = matchMedia('(prefers-reduced-motion: reduce)');

const pad = (n: number) => String(n).padStart(2, '0');
// Saving the step and its timers is a convenience: with storage blocked, cooking carries
// on unsaved.
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
  const notes = part('[data-rc-notes]');
  const meanwhile = part('[data-rc-meanwhile]');
  const cue = part('[data-rc-cue]');
  const countdownLabel = part('[data-rc-countdown-label]');
  const timerButton = part<HTMLButtonElement>('[data-rc-timer]');
  const countdown = part('[data-rc-countdown]');
  const countdownTime = part('[data-rc-countdown-time]');
  const timerList = part('[data-rc-timers]');
  const cancel = part<HTMLButtonElement>('[data-rc-cancel]');
  const announce = card.querySelector('[data-rc-announce]');
  const back = part<HTMLButtonElement>('[data-rc-back]');
  const next = part<HTMLButtonElement>('[data-rc-next]');
  const storageKey = `recipe-step:${location.pathname}`;
  const timersKey = `recipe-timers:${location.pathname}`;

  // ===== Scaling and view =====

  const scale = (factor: number) => {
    for (const quantity of card.querySelectorAll<HTMLElement>('.rc-qty[data-amount]')) {
      if (quantity.dataset.fixed !== undefined) continue;
      const amount = Number(quantity.dataset.amount) * factor;
      quantity.textContent =
        quantity.dataset.yield === undefined
          ? formatAmount(amount, quantity.dataset.unit)
          : formatYield(amount);
    }
    // Gear and instructions that read differently at this amount
    for (const version of card.querySelectorAll<HTMLElement>('[data-scale-only]')) {
      version.hidden = Number(version.dataset.scaleOnly) !== factor;
    }
    for (const written of card.querySelectorAll<HTMLElement>('[data-scale-except]')) {
      written.hidden = (written.dataset.scaleExcept ?? '').split(' ').map(Number).includes(factor);
    }
  };

  // While part of the table hides to the right, the frame fades its edge and says so.
  const showMore = () => {
    if (!frame || !wrap) return;
    frame.classList.toggle('has-more', wrap.scrollWidth - wrap.clientWidth - wrap.scrollLeft > 2);
  };
  wrap?.addEventListener('scroll', showMore, { passive: true });
  // Also runs when the table is first shown or a view is chosen: its size changes then.
  if (wrap) new ResizeObserver(showMore).observe(wrap);

  const setView = (view: string) => {
    card.dataset.view = view;
    const radio = card.querySelector<HTMLInputElement>(`input[name="rc-view"][value="${view}"]`);
    if (radio) radio.checked = true;
  };
  // The card arrives with its view already chosen (RecipeCard.astro's inline script).
  setView(card.dataset.view ?? 'steps');
  // A phone has the steps only, whatever was chosen on a wider screen.
  const tableShown = () => wide.matches && card.dataset.view === 'table';

  const scrolling = (): ScrollBehavior => (still.matches ? 'auto' : 'smooth');
  const nameOf = (stage: number) => textOf(stages[stage]?.querySelector('.rc-steps-do'));
  const say = (message: string) => {
    if (announce) announce.textContent = message;
  };
  // A step's picture waits to load until it is near the window. Shown by a pick or by
  // cooking mode, it is wanted now.
  const loadPictures = (stage: number) => {
    for (const picture of stages[stage]?.querySelectorAll('img') ?? []) picture.loading = 'eager';
  };

  // Brings a step into view. In the list it goes to the top of the window, so a step
  // taller than the room above the cooking bar still shows its number, its name and what
  // goes in. In the table its column goes just right of the pinned ingredient column,
  // never under it.
  const reveal = (stage: number) => {
    if (!tableShown()) {
      stages[stage]?.scrollIntoView({ block: 'start', behavior: scrolling() });
      return;
    }
    const cell = cells.find((item) => Number(item.dataset.stage) === stage);
    if (!cell) return;
    const pinned = card.querySelector<HTMLElement>('.rc-ingredient')?.offsetWidth ?? 0;
    if (wrap && cell.matches('.rc-step')) {
      const left = cell.getBoundingClientRect().left - wrap.getBoundingClientRect().left;
      // At once, not smoothly: the scroll below would cut a smooth one short and leave
      // the column under the pinned one.
      wrap.scrollBy({ left: left - pinned - 8 });
    }
    cell.scrollIntoView({ block: 'center', inline: 'nearest', behavior: scrolling() });
  };

  // ===== The step picked in the table =====

  // Picking a step in the table shows it under the table, as the list has it. Focus stays
  // on the step's name in the table, so the next pick is one key away; picking the step
  // that shows puts it away.
  let picked = -1;
  const pick = (stage: number) => {
    picked = stage === picked ? -1 : stage;
    for (const item of [...stages, ...cells]) {
      const shown = Number(item.dataset.stage) === picked;
      item.classList.toggle('is-picked', shown);
      const link = item.querySelector('a[href^="#rc-step-"]');
      if (shown) link?.setAttribute('aria-current', 'true');
      else link?.removeAttribute('aria-current');
    }
    if (picked < 0) return;
    loadPictures(picked);
    say(`Step ${picked + 1}, ${nameOf(picked)}, is shown under the table.`);
    stages[picked]?.scrollIntoView({ block: 'nearest', behavior: scrolling() });
  };

  card.querySelector('[data-rc-all]')?.addEventListener('click', () => {
    setView('steps');
    stages[0]?.querySelector<HTMLElement>('.rc-steps-do')?.focus({ preventScroll: true });
  });

  card.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === 'rc-scale') {
      scale(Number(input.value));
      if (current >= 0) describe();
    }
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

  // The timers a step offers: one for the whole step, or one per stage of it.
  const phasesOf = (stage: number): RecipeTimer[] =>
    JSON.parse(stages[stage]?.dataset.timers ?? '[]');
  const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

  // Running timers are kept with the step, so a reload in the middle of a bake loses neither.
  const keepTimers = () => {
    remember(() =>
      timers.length > 0
        ? sessionStorage.setItem(timersKey, JSON.stringify(timers))
        : sessionStorage.removeItem(timersKey)
    );
  };

  const renderTimers = () => {
    const now = Date.now();
    const own = timers.find((timer) => timer.stage === current);
    const phases = phasesOf(current);
    // The last step's button ends cooking, and says so when that stops a timer.
    const running = timers.filter((timer) => !timer.done).length;
    if (next) {
      next.textContent =
        current < stages.length - 1
          ? 'Next'
          : running > 0
            ? `Done, and stop the ${running > 1 ? 'timers' : 'timer'}`
            : 'Done';
    }
    if (cancel) cancel.hidden = !own || own.done;
    if (timerButton) {
      timerButton.hidden = phases.length === 0 || Boolean(own);
      const [first, ...rest] = phases.map((phase) => phase.minutes);
      timerButton.textContent =
        rest.length > 0
          ? `Start timer: ${first} min, then ${rest.join(', then ')} min`
          : `Start ${first}-minute timer`;
    }
    if (countdown && countdownTime) {
      countdown.hidden = !own;
      if (own) countdownTime.textContent = own.done ? 'Done' : clock(own.end - now);
      const then = own && !own.done ? own.phases[own.phase]?.cue : undefined;
      if (countdownLabel) {
        countdownLabel.textContent = then ? `then ${lower(then)}` : 'left on this step';
      }
    }
    if (cue) {
      cue.hidden = !own?.cue || own.done;
      cue.textContent = own?.cue ? `Now: ${lower(own.cue)}` : '';
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
      // A stage that ends hands over to the next one from its own end, not from now, so
      // a tab that slept does not lengthen the bake.
      while (!timer.done && timer.end <= now) {
        const finished = timer.phases[timer.phase];
        const following = timer.phases[timer.phase + 1];
        chime();
        if (following) {
          timer.cue = finished?.cue ?? '';
          timer.phase += 1;
          timer.start = timer.end;
          timer.end += following.minutes * 60_000;
          say(`${timer.label}: ${timer.cue || 'next stage'}. ${following.minutes} minutes to go.`);
        } else {
          timer.done = true;
          say(`Time's up: ${timer.label}.`);
        }
        keepTimers();
      }
    }
    renderTimers();
    if (timers.every((timer) => timer.done)) {
      clearInterval(ticking);
      ticking = 0;
    }
  };

  const startTimer = () => {
    const phases = phasesOf(current);
    const first = phases[0];
    if (!first) return;
    // Created on a click, so the browser allows it to play the chime later.
    audio ??= new AudioContext();
    const now = Date.now();
    timers.push({
      stage: current,
      label: nameOf(current),
      phases,
      phase: 0,
      start: now,
      end: now + first.minutes * 60_000,
      cue: '',
      done: false,
    });
    if (!ticking) ticking = window.setInterval(tick, 1000);
    keepTimers();
    renderTimers();
    // The button that was pressed is gone; the way on takes the focus.
    next?.focus();
    say(
      first.cue
        ? `${first.minutes}-minute timer started. Then ${lower(first.cue)}.`
        : `${first.minutes}-minute timer started.`
    );
  };

  // For a timer started too early, or rolls that come out before their time.
  const cancelTimer = () => {
    const own = timers.findIndex((timer) => timer.stage === current);
    if (own < 0) return;
    timers.splice(own, 1);
    keepTimers();
    renderTimers();
    timerButton?.focus();
    say('Timer cancelled.');
  };

  // The bar says what the step you're on says, at the amount chosen.
  const describe = () => {
    const item = stages[current];
    const list = item?.querySelector('.rc-uses');
    uses?.replaceChildren(...(list ? [list.cloneNode(true)] : []));
    if (detail) detail.textContent = textOf(item?.querySelector('.rc-steps-detail:not([hidden])'));
    const asides = item?.querySelector('.rc-notes');
    if (notes instanceof HTMLDetailsElement) {
      notes.hidden = !asides;
      notes.open = false;
      notes
        .querySelector('[data-rc-notes-body]')
        ?.replaceChildren(...(asides ? [asides.cloneNode(true)] : []));
    }
    if (meanwhile) {
      const task = textOf(item?.querySelector('.rc-steps-meanwhile'));
      meanwhile.hidden = !task;
      meanwhile.textContent = task;
    }
    placeBar();
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
    keepTimers();

    const name = nameOf(current);
    if (count) count.textContent = `Step ${current + 1} of ${stages.length}`;
    if (title) title.textContent = name;
    if (back) back.disabled = current === 0;
    loadPictures(current);
    renderTimers();
    describe();
    // Focus stays on Next, so the new step is said aloud.
    say(`Step ${current + 1} of ${stages.length}: ${name}.`);
    reveal(current);
  };

  const start = (stage = 0) => {
    if (picked >= 0) pick(picked);
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
    keepTimers();
    renderTimers();
    say('');
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
  cancel?.addEventListener('click', cancelTimer);

  // A step in the table leads to how it is done. While cooking that is the step itself;
  // otherwise the step is shown under the table, with its notes and its picture.
  for (const cell of cells) {
    cell.addEventListener('click', (event) => {
      event.preventDefault();
      const stage = Number(cell.dataset.stage);
      if (current >= 0) show(stage);
      else pick(stage);
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

  // A reload in the middle of cooking comes back to the step, with its timers still
  // running. Time that passed meanwhile has passed for them too.
  const saved = remember(() => sessionStorage.getItem(storageKey)) ?? null;
  if (saved !== null) {
    // Only keepTimers writes this entry, so what comes back is what it put there.
    const kept: Timer[] =
      remember(() => JSON.parse(sessionStorage.getItem(timersKey) ?? '[]')) ?? [];
    timers.push(...kept);
    start(Number(saved));
    if (timers.length > 0) {
      tick();
      if (timers.some((timer) => !timer.done)) ticking = window.setInterval(tick, 1000);
      // The chime needs a sound context, and a browser only grants one on a press.
      card.addEventListener('click', () => (audio ??= new AudioContext()), { once: true });
    }
  }
}

for (const card of document.querySelectorAll<HTMLElement>('[data-recipe-card]')) {
  initRecipeCard(card);
}
