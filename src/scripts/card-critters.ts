// The critters on the listing cards (src/components/CardMark.astro) each move a little,
// in CSS. A leg or a wing inside a drawing is painted again on every frame it moves, so
// a critter moves only while its card is on screen.

function initCardCritters(): void {
  const cards = document.querySelectorAll<HTMLElement>(
    '.sc-card:has(.sc-mark-edge, .sc-mark-mouse)'
  );
  if (!cards.length || !('IntersectionObserver' in window)) return;

  // A card a little below the fold keeps its critter moving, so it is already on the go
  // when it scrolls into view.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute('data-still', !entry.isIntersecting);
      }
    },
    { rootMargin: '20%' }
  );
  for (const card of cards) observer.observe(card);
}

initCardCritters();
