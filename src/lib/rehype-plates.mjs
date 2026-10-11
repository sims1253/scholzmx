// Mounts every Markdown image on its own plate, and tells photographs from plots.
//
// Quarto writes the figures it renders beside the post (`./DAG-1.png`), while
// photographs are authored under src/assets/images (`../../../../assets/images/...`).
// A plate carries that origin as data-print="photo" or data-print="plot", so the
// stylesheet can give photographs film grain while plots stay crisp. Images from
// elsewhere (absolute URLs, raw HTML) are left as they are.
//
// Runs before Astro's own image plugin, so `src` is still the author's path.

const PLATE_PARENTS = new Set(['p', 'figure']);

function printKind(src = '') {
  if (!src || /^(?:[a-z]+:)?\/\//i.test(src)) return undefined;
  if (/(?:^|\/)assets\/images\//.test(src)) return 'photo';
  if (src.startsWith('./') || !src.includes('/')) return 'plot';
  return undefined;
}

function mount(node) {
  if (!Array.isArray(node.children)) return;
  for (let index = 0; index < node.children.length; index++) {
    const child = node.children[index];
    if (child.type !== 'element') continue;
    const kind =
      child.tagName === 'img' && PLATE_PARENTS.has(node.tagName)
        ? printKind(child.properties?.src)
        : undefined;
    if (kind) {
      node.children[index] = {
        type: 'element',
        tagName: 'span',
        properties: { className: ['plate'], dataPrint: kind },
        children: [child],
      };
    } else {
      mount(child);
    }
  }
}

export default function rehypePlates() {
  return (tree) => mount(tree);
}
