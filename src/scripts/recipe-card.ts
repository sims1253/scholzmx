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
  /** What the last finished stage asked for, e.g. "Turn the oven down to 200 °C", until
   *  the cook says it is done. */
  cue: string;
  done: boolean;
}

const wide = matchMedia('(min-width: 48rem)');
const still = matchMedia('(prefers-reduced-motion: reduce)');

/** What a reload in the middle of cooking brings back. */
interface Cooking {
  step: number;
  timers: Timer[];
  amount: string;
  view: string;
  /** The ingredients ticked off in the list to gather from, by position. */
  gathered: number[];
}

const pad = (n: number) => String(n).padStart(2, '0');
// Saving where the cook is is a convenience: with storage blocked, cooking carries on
// unsaved.
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
  const table = card.querySelector<HTMLElement>('.rc-table');
  const heads = [...card.querySelectorAll<HTMLElement>('.rc-above')];
  const stages = [...card.querySelectorAll<HTMLElement>('.rc-steps-item')];
  const cells = [...card.querySelectorAll<HTMLElement>('.rc-table [data-stage]')];
  const rows = [...card.querySelectorAll<HTMLElement>('tr[data-taken-at]')];
  if (!controls || !bar || !inner || !sheet || stages.length === 0) return;
  controls.hidden = false;
  const gathering = card.querySelector('.rc-corner[data-stage]') !== null;

  const part = <T extends HTMLElement>(selector: string) => bar.querySelector<T>(selector);
  const count = part('[data-rc-count]');
  const title = part('[data-rc-do]');
  const detail = part('[data-rc-detail]');
  const notes = part('[data-rc-notes]');
  const meanwhile = part('[data-rc-meanwhile]');
  const cue = part('[data-rc-cue]');
  const cueText = part('[data-rc-cue-text]');
  const cueDone = part<HTMLButtonElement>('[data-rc-cue-done]');
  const countdownLabel = part('[data-rc-countdown-label]');
  const timerButton = part<HTMLButtonElement>('[data-rc-timer]');
  const countdown = part('[data-rc-countdown]');
  const countdownTime = part('[data-rc-countdown-time]');
  const timerList = part('[data-rc-timers]');
  const cancel = part<HTMLButtonElement>('[data-rc-cancel]');
  const announce = card.querySelector('[data-rc-announce]');
  const alarm = card.querySelector('[data-rc-alarm]');
  const back = part<HTMLButtonElement>('[data-rc-back]');
  const next = part<HTMLButtonElement>('[data-rc-next]');
  const stopButton = part<HTMLButtonElement>('[data-rc-stop]');
  const ticks = [...card.querySelectorAll<HTMLInputElement>('.rc-gather-list input')];
  const cookingKey = `recipe-cooking:${location.pathname}`;

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

  // Where the table scrolls sideways it stops with a step's column starting at the pinned
  // ingredient column, so nothing of a half-hidden column shows beside it. These are the
  // scroll positions that do that, one per column.
  const pinnedWidth = () => card.querySelector<HTMLElement>('.rc-ingredient')?.offsetWidth ?? 0;
  const columnStops = () => {
    const origin = (table?.getBoundingClientRect().left ?? 0) + pinnedWidth();
    return heads.map((head) => head.getBoundingClientRect().left - origin);
  };

  // While part of the table hides to the right, the frame fades its edge and says so.
  const showMore = () => {
    if (!frame || !wrap || !table) return;
    frame.classList.toggle('has-more', table.offsetWidth - wrap.clientWidth - wrap.scrollLeft > 2);
  };
  // The last stop may lie past the table's end. The table then gets that much room after
  // its last column, or it could not come to rest there.
  const fitTable = () => {
    if (!wrap || !table) return;
    const hidden = table.offsetWidth - wrap.clientWidth;
    const last = hidden > 2 ? columnStops().find((stop) => stop >= hidden - 1) : undefined;
    wrap.style.setProperty('--rc-pinned', `${pinnedWidth()}px`);
    wrap.style.setProperty('--rc-run', last ? `${Math.ceil(last) + wrap.clientWidth - 1}px` : '0');
    showMore();
  };
  wrap?.addEventListener('scroll', showMore, { passive: true });
  // Also runs when the table is first shown, a view is chosen or the amount changes: its
  // size changes then.
  if (wrap && table) {
    const resized = new ResizeObserver(fitTable);
    resized.observe(wrap);
    resized.observe(table);
  }

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
  // Where the cook is can wait its turn to be read out; a timer cannot.
  const say = (message: string) => {
    if (announce) announce.textContent = message;
  };
  const sound = (message: string) => {
    if (alarm) alarm.textContent = message;
  };
  // A step's picture waits to load until it is near the window. Shown by a pick or by
  // cooking mode, it is wanted now.
  const loadPictures = (stage: number) => {
    for (const picture of stages[stage]?.querySelectorAll('img') ?? []) picture.loading = 'eager';
  };

  // Paper has every step, so every picture is wanted before the page is printed.
  window.addEventListener('beforeprint', () => stages.forEach((_, stage) => loadPictures(stage)));

  const cellOf = (stage: number) => cells.find((item) => Number(item.dataset.stage) === stage);

  // Where the table scrolls sideways, a step's column has to be in full view between the
  // pinned ingredient column and the right edge (short of the fade over that edge, while
  // more follows). Of the stops that show it so, the table takes the nearest: a column
  // that is there already stays where it is, and one that is not moves no further than it
  // has to. At once, not smoothly: a scroll of the page that follows would cut a smooth
  // one short.
  const showColumn = (stage: number) => {
    const cell = cellOf(stage);
    if (!wrap || !table || !cell) return;
    // Getting ready is the ingredient column itself.
    if (!cell.matches('.rc-step')) {
      wrap.scrollTo({ left: 0 });
      return;
    }
    const origin = table.getBoundingClientRect().left;
    const column = cell.getBoundingClientRect();
    const fade =
      column.right - origin < table.offsetWidth - 2
        ? parseFloat(getComputedStyle(wrap).fontSize) * 3
        : 0;
    const most = column.left - origin - pinnedWidth();
    const least = column.right - origin - (wrap.clientWidth - fade);
    const at = wrap.scrollLeft;
    const [nearest = most] = columnStops()
      .filter((stop) => stop >= least - 1 && stop <= most + 1)
      .sort((a, b) => Math.abs(a - at) - Math.abs(b - at));
    wrap.scrollTo({ left: nearest });
  };

  // Brings a step into view. In the list it goes to the top of the window, so a step
  // taller than the room above the cooking bar still shows its number, its name and what
  // goes in. In the table its column comes into view.
  const reveal = (stage: number) => {
    if (!tableShown()) {
      stages[stage]?.scrollIntoView({ block: 'start', behavior: scrolling() });
      return;
    }
    showColumn(stage);
    cellOf(stage)?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: scrolling() });
  };

  // ===== The step picked in the table =====

  // Focus goes where the reader was sent, and the page follows it there.
  const focusStep = (stage: number, block: ScrollLogicalPosition) => {
    stages[stage]?.querySelector<HTMLElement>('.rc-steps-do')?.focus({ preventScroll: true });
    stages[stage]?.scrollIntoView({ block, behavior: scrolling() });
  };

  // Picking a step in the table shows it under the table, as the list has it, and takes
  // the reader there; "Back to the table" under it then leads back to the step's name. Picking
  // the step that shows already takes the reader to it too: a pick never puts a step away.
  // The table opens with its first step shown, so the method is on the page before
  // anything is picked: that one is `quiet`. Cooking puts the picked step away (-1).
  let picked = -1;
  const toTable = card.querySelector<HTMLElement>('.rc-to-table');
  const pick = (stage: number, quiet = false) => {
    picked = stage;
    for (const item of [...stages, ...cells]) {
      const shown = Number(item.dataset.stage) === picked;
      item.classList.toggle('is-picked', shown);
      const link = item.querySelector('a[href^="#rc-step-"]');
      if (shown) link?.setAttribute('aria-current', 'true');
      else link?.removeAttribute('aria-current');
    }
    if (toTable) toTable.hidden = quiet || picked < 0;
    if (picked < 0) return;
    loadPictures(picked);
    if (quiet) return;
    showColumn(picked);
    say(`Step ${picked + 1}, ${nameOf(picked)}, is shown under the table.`);
    focusStep(picked, 'nearest');
  };

  card.querySelector('[data-rc-to-table]')?.addEventListener('click', () => {
    const name = cellOf(Math.max(picked, 0))?.querySelector<HTMLElement>('a');
    showColumn(Math.max(picked, 0));
    name?.focus({ preventScroll: true });
    name?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: scrolling() });
  });

  card.querySelector('[data-rc-all]')?.addEventListener('click', () => {
    setView('steps');
    focusStep(0, 'start');
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
    keep();
  });

  // ===== Cooking =====

  let current = -1;
  let wakeLock: WakeLockSentinel | null = null;
  let audio: AudioContext | null = null;
  const timers: Timer[] = [];
  const chips = new Map<number, HTMLButtonElement>();
  let ticking = 0;
  let stopAsked = 0;

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

  const running = () => timers.filter((timer) => !timer.done).length;

  // While cooking, the step is kept with its timers, the amount, the view and what has
  // been gathered, so a reload in the middle of a bake comes back to the same card.
  const keep = () => {
    remember(() => {
      if (current < 0) {
        sessionStorage.removeItem(cookingKey);
        return;
      }
      const cooking: Cooking = {
        step: current,
        timers,
        amount:
          card.querySelector<HTMLInputElement>('input[name="rc-scale"]:checked')?.value ?? '1',
        view: card.dataset.view ?? 'steps',
        gathered: ticks.flatMap((tick, index) => (tick.checked ? [index] : [])),
      };
      sessionStorage.setItem(cookingKey, JSON.stringify(cooking));
    });
  };

  const renderTimers = () => {
    const now = Date.now();
    const own = timers.find((timer) => timer.stage === current);
    const phases = phasesOf(current);
    // The last step's button ends cooking, and says so when that stops a timer.
    if (next) {
      next.textContent =
        current < stages.length - 1
          ? 'Next'
          : running() > 0
            ? `Done, and stop the ${running() > 1 ? 'timers' : 'timer'}`
            : 'Done';
    }
    if (cancel) cancel.hidden = !own || own.done;
    if (timerButton) {
      timerButton.hidden = phases.length === 0 || Boolean(own);
      const [first, ...rest] = phases.map((phase) => phase.minutes);
      timerButton.textContent =
        rest.length > 0
          ? `Start timer: ${first}\u00a0min, then ${rest.join('\u00a0min, then ')}\u00a0min`
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
    // What a finished stage asks for goes with its timer to whatever step the cook is
    // on, and stays until the cook says it is done, also after the timer has ended.
    const asked = timers.find((timer) => timer.cue);
    if (cue && cueText) {
      cue.hidden = !asked;
      cueText.textContent = asked
        ? `${asked.stage === current ? 'Now' : `${asked.label}, now`}: ${lower(asked.cue)}`
        : '';
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
          timer.cue = finished?.cue || timer.cue;
          timer.phase += 1;
          timer.start = timer.end;
          timer.end += following.minutes * 60_000;
          sound(
            `${timer.label}: ${timer.cue || 'next stage'}. ${following.minutes} minutes to go.`
          );
        } else {
          timer.done = true;
          sound(`Time's up: ${timer.label}.`);
        }
        keep();
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
    keep();
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
    keep();
    renderTimers();
    timerButton?.focus();
    say('Timer cancelled.');
  };

  // The cook has done what a finished stage asked for.
  cueDone?.addEventListener('click', () => {
    for (const timer of timers) timer.cue = '';
    keep();
    renderTimers();
    next?.focus();
  });

  // The bar says what the step you're on says, at the amount chosen. Over the table,
  // which hides the step list, it also keeps the step's notes and its picture, folded.
  const describe = () => {
    const item = stages[current];
    if (detail) detail.textContent = textOf(item?.querySelector('.rc-steps-detail:not([hidden])'));
    const asides = item?.querySelector('.rc-notes');
    const picture = item?.querySelector('.rc-photo');
    if (notes instanceof HTMLDetailsElement) {
      const more = [asides, picture].flatMap((part) => (part ? [part.cloneNode(true)] : []));
      const summary = notes.querySelector('summary');
      if (summary) {
        summary.textContent =
          asides && picture ? 'Notes and a picture' : picture ? 'A picture' : 'Notes';
      }
      notes.hidden = more.length === 0;
      notes.open = false;
      notes.querySelector('[data-rc-notes-body]')?.replaceChildren(...more);
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
    unask();

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

    // Finished timers for steps you've moved past are put away, unless one still asks
    // for something.
    for (let index = timers.length - 1; index >= 0; index--) {
      const timer = timers[index];
      if (timer && timer.done && !timer.cue && timer.stage < current) timers.splice(index, 1);
    }
    keep();

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
    pick(-1, true);
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
    const last = current;
    unask();
    card.classList.remove('is-cooking', 'is-gathering');
    document.documentElement.classList.remove('rc-cooking');
    document.documentElement.style.removeProperty('--rc-bar');
    bar.hidden = true;
    current = -1;
    for (const item of [...stages, ...cells, ...rows]) {
      item.classList.remove('is-current', 'is-done', 'is-used');
    }
    timers.length = 0;
    keep();
    renderTimers();
    say('');
    sound('');
    clearInterval(ticking);
    ticking = 0;
    void wakeLock?.release();
    wakeLock = null;
    // Under the table, the step the cook stopped at.
    pick(last, true);
    card.querySelector<HTMLButtonElement>('[data-rc-start]')?.focus();
  };

  // Stopping drops every running timer, so with one running it takes two presses: the
  // first says what will go. Anything else the cook does takes the question back.
  const unask = () => {
    clearTimeout(stopAsked);
    stopAsked = 0;
    if (stopButton) stopButton.textContent = 'Stop cooking';
    stopButton?.classList.remove('is-asking');
  };
  const askToStop = () => {
    const count = running();
    if (count === 0 || stopAsked) {
      stop();
      return;
    }
    const what =
      count > 1 ? `${count} timers` : `${lower(timers.find((t) => !t.done)?.label ?? '')} timer`;
    if (stopButton) stopButton.textContent = `Drop the ${count > 1 ? 'timers' : 'timer'} and stop?`;
    stopButton?.classList.add('is-asking');
    say(`The ${what} would be dropped. Press Stop again to stop cooking.`);
    stopAsked = window.setTimeout(unask, 8000);
  };

  card.querySelector('[data-rc-start]')?.addEventListener('click', () => start());
  stopButton?.addEventListener('click', askToStop);
  stopButton?.addEventListener('blur', unask);
  for (const tick of ticks) tick.addEventListener('change', keep);
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
    // In the table's scroller the arrows scroll the table.
    const scrolls = event.target instanceof Element && event.target.closest('.rc-table-wrap');
    if (event.key === 'ArrowRight' && !scrolls) show(current + 1);
    if (event.key === 'ArrowLeft' && !scrolls) show(current - 1);
    // Escape leaves cooking, but never takes a running timer with it: it asks, as a press
    // on "Stop cooking" does, and leaves the answer to that button.
    if (event.key === 'Escape') {
      if (running() === 0) stop();
      else {
        stopButton?.focus();
        if (!stopAsked) askToStop();
      }
    }
  });

  // The screen lock is dropped whenever the tab is hidden; take it back on return.
  document.addEventListener('visibilitychange', () => {
    if (current >= 0 && document.visibilityState === 'visible') void keepAwake();
  });

  // A reload in the middle of cooking comes back to the card as it was: the amount, the
  // view and what was gathered first, then the step with its timers still running. Time
  // that passed meanwhile has passed for them too. Only `keep` writes this entry.
  const saved = remember((): Cooking | null =>
    JSON.parse(sessionStorage.getItem(cookingKey) ?? 'null')
  );
  if (saved) {
    const amount = card.querySelector<HTMLInputElement>(
      `input[name="rc-scale"][value="${saved.amount}"]`
    );
    if (amount) {
      amount.checked = true;
      scale(Number(saved.amount));
    }
    setView(saved.view);
    for (const index of saved.gathered) {
      const tick = ticks[index];
      if (tick) tick.checked = true;
    }
    timers.push(...saved.timers);
    start(saved.step);
    if (timers.length > 0) {
      tick();
      if (running() > 0) ticking = window.setInterval(tick, 1000);
      // The chime needs a sound context, and a browser only grants one on a press.
      card.addEventListener('click', () => (audio ??= new AudioContext()), { once: true });
    }
  } else {
    pick(0, true);
  }
}

for (const card of document.querySelectorAll<HTMLElement>('[data-recipe-card]')) {
  initRecipeCard(card);
}
