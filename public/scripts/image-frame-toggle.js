// A frame with a second photo on its back: the button under it turns it over, and so
// does a click on the photo. The button carries the state; each photo keeps its own
// description, and only the one that shows is read out.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.image-frame.clickable').forEach(function (frame) {
    const button = frame.nextElementSibling;
    if (!button || !button.matches('.frame-turn')) return;
    button.hidden = false;

    const turn = function () {
      const turned = frame.classList.toggle('show-alternate');
      button.setAttribute('aria-pressed', String(turned));
      frame.querySelector('.primary-image')?.setAttribute('aria-hidden', String(turned));
      frame.querySelector('.alternate-image')?.setAttribute('aria-hidden', String(!turned));
    };

    button.addEventListener('click', turn);
    frame.addEventListener('click', turn);
  });
});
