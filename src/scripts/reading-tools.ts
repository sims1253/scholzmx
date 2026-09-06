const body = document.querySelector<HTMLElement>('[data-reading-body]');
const control = document.querySelector<HTMLSelectElement>('.reading-size select');
const label = document.querySelector<HTMLElement>('.reading-size');

if (body && control && label) {
  const applySize = (value: string) => {
    const size = ['1', '1.15', '1.3'].includes(value) ? value : '1';
    body.style.setProperty('--reading-scale', size);
    control.value = size;
    // Margin notes already recalculate their positions on resize.
    window.dispatchEvent(new Event('resize'));
  };

  try {
    applySize(localStorage.getItem('grotto-reading-size') ?? '1');
  } catch {
    applySize('1');
  }
  label.hidden = false;
  control.addEventListener('change', () => {
    applySize(control.value);
    try {
      localStorage.setItem('grotto-reading-size', control.value);
    } catch {
      // The selection still applies to this page when storage is unavailable.
    }
  });
}
