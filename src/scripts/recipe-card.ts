// Recipe cards: scaling, table or steps, and a cooking mode that walks through the steps.
// Everything reads from the server-rendered card, so the page works without this script.
import { formatAmount } from '../lib/recipe';

interface Timer {
  stage: number;
  label: string;
  end: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const rest = `${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  return hours ? `${hours}:${rest}` : rest;
};

function initRecipeCard(card: HTMLElement): void {
  const controls = card.querySelector<HTMLElement>('[data-rc-controls]');
  const bar = card.querySelector<HTMLElement>('[data-rc-cook]');
  const stages = [...card.querySelectorAll<HTMLElement>('.rc-steps-item')];
  const cells = [...card.querySelectorAll<HTMLElement>('.rc-step[data-stage]')];
  const rows = [...card.querySelectorAll<HTMLElement>('tr[data-taken-at]')];
  if (!controls || !bar || stages.length === 0) return;
  controls.hidden = false;

  const part = <T extends HTMLElement>(selector: string) => bar.querySelector<T>(selector);
  const count = part('[data-rc-count]');
  const title = part('[data-rc-do]');
  const detail = part('[data-rc-detail]');
  const meanwhile = part('[data-rc-meanwhile]');
  const timerButton = part<HTMLButtonElement>('[data-rc-timer]');
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
  };

  const setView = (view: string) => {
    card.dataset.view = view;
    const radio = card.querySelector<HTMLInputElement>(`input[name="rc-view"][value="${view}"]`);
    if (radio) radio.checked = true;
  };
  setView(matchMedia('(max-width: 48rem)').matches ? 'steps' : 'table');

  card.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === 'rc-scale') scale(Number(input.value));
    if (input.name === 'rc-view') setView(input.value);
  });

  // ===== Cooking =====

  let current = -1;
  let wakeLock: WakeLockSentinel | null = null;
  let audio: AudioContext | null = null;
  const timers: Timer[] = [];
  let ticking = 0;

  const stageText = (stage: number, selector: string) =>
    stages[stage]?.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

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

  const renderTimers = () => {
    if (!timerList) return;
    const now = Date.now();
    timerList.textContent = timers
      .map((timer) => `${timer.label} ${timer.end > now ? clock(timer.end - now) : 'done'}`)
      .join('   ');
    const running = timers.find((timer) => timer.stage === current);
    if (timerButton) {
      const minutes = Number(stages[current]?.dataset.minutes ?? 0);
      timerButton.hidden = minutes === 0 || Boolean(running);
      timerButton.textContent = `Start ${minutes}-minute timer`;
    }
  };

  const tick = () => {
    const now = Date.now();
    for (const timer of timers) {
      if (timer.end <= now && timer.end > 0) {
        timer.end = 0;
        chime();
        say(`Time's up: ${timer.label}.`);
      }
    }
    renderTimers();
    if (!timers.some((timer) => timer.end > 0)) {
      clearInterval(ticking);
      ticking = 0;
    }
  };

  const startTimer = () => {
    const minutes = Number(stages[current]?.dataset.minutes ?? 0);
    if (!minutes) return;
    // Created on a click, so the browser allows it to play the chime later.
    audio ??= new AudioContext();
    timers.push({
      stage: current,
      label: stageText(current, '.rc-steps-do'),
      end: Date.now() + minutes * 60_000,
    });
    if (!ticking) ticking = window.setInterval(tick, 1000);
    renderTimers();
    say(`${minutes}-minute timer started.`);
  };

  const show = (stage: number) => {
    current = Math.max(0, Math.min(stages.length - 1, stage));
    sessionStorage.setItem(storageKey, String(current));

    for (const item of [...stages, ...cells]) {
      const at = Number(item.dataset.stage);
      item.classList.toggle('is-current', at === current);
      item.classList.toggle('is-done', at < current);
    }
    for (const row of rows) {
      const takenAt = Number(row.dataset.takenAt);
      row.classList.toggle('is-current', takenAt === current);
      row.classList.toggle('is-used', takenAt < current);
    }

    if (count) count.textContent = `Step ${current + 1} of ${stages.length}`;
    if (title) title.textContent = stageText(current, '.rc-steps-do');
    if (detail) {
      detail.textContent =
        stageText(current, '.rc-steps-detail') || stageText(current, '.rc-steps-uses');
    }
    if (meanwhile) {
      const task = stageText(current, '.rc-steps-meanwhile');
      meanwhile.hidden = !task;
      meanwhile.textContent = task;
    }
    if (back) back.disabled = current === 0;
    if (next) next.textContent = current === stages.length - 1 ? 'Done' : 'Next';
    renderTimers();

    const target =
      card.dataset.view === 'steps'
        ? stages[current]
        : cells.find((cell) => Number(cell.dataset.stage) === current);
    target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  };

  const start = (stage = 0) => {
    card.classList.add('is-cooking');
    document.documentElement.classList.add('rc-cooking');
    bar.hidden = false;
    void keepAwake();
    show(stage);
    next?.focus();
  };

  const stop = () => {
    card.classList.remove('is-cooking');
    document.documentElement.classList.remove('rc-cooking');
    bar.hidden = true;
    current = -1;
    sessionStorage.removeItem(storageKey);
    for (const item of [...stages, ...cells, ...rows]) {
      item.classList.remove('is-current', 'is-done', 'is-used');
    }
    timers.length = 0;
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

  const saved = sessionStorage.getItem(storageKey);
  if (saved !== null) start(Number(saved));
}

for (const card of document.querySelectorAll<HTMLElement>('[data-recipe-card]')) {
  initRecipeCard(card);
}
