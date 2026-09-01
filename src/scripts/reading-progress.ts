import { bootstrapComponent } from './client-bootstrap';

bootstrapComponent('reading-progress', (): (() => void) => {
  const progressBar = document.querySelector<HTMLElement>('.reading-progress');
  if (!progressBar) return () => {};

  const proseContent = document.querySelector<HTMLElement>('.prose');
  if (!proseContent) {
    progressBar.hidden = true;
    return () => {};
  }

  progressBar.hidden = false;
  progressBar.setAttribute('aria-valuenow', '0');
  progressBar.setAttribute('aria-valuetext', '0%');

  const bar = progressBar.querySelector<HTMLElement>('.progress-bar');
  if (!bar) return () => {};

  let ticking = false;

  function updateProgress(): void {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollableHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0
      );
      const progress =
        scrollableHeight === 0
          ? 0
          : Math.min(Math.max((scrollTop / scrollableHeight) * 100, 0), 100);
      const roundedProgress = Math.round(progress);

      bar!.style.width = `${progress}%`;
      progressBar!.setAttribute('aria-valuenow', String(roundedProgress));
      progressBar!.setAttribute('aria-valuetext', `${roundedProgress}%`);

      if (progress > 5) {
        progressBar!.classList.add('has-progress');
      } else {
        progressBar!.classList.remove('has-progress');
      }

      ticking = false;
    });
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  // Return cleanup function
  return () => {
    window.removeEventListener('scroll', updateProgress);
    window.removeEventListener('resize', updateProgress);
  };
});
