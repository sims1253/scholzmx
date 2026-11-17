/**
 * Renders the `$...$` and `$$...$$` maths that remark-math marks to MathML at build time.
 *
 * Browsers lay out MathML themselves, so a page needs no maths script and no layout
 * stylesheet; `src/styles/math.css` sets the maths font and a few corrections. Each
 * formula keeps its LaTeX source in a MathML annotation, which is not displayed.
 */
import temml from 'temml';
import { fromHtml } from 'hast-util-from-html';
import type { Element, ElementContent, Parents, Root } from 'hast';
import type { VFile } from 'vfile';

/** Replaces each maths `code` element (and its `pre` for display maths) with MathML. */
export default function rehypeTemml() {
  return (tree: Root, file: VFile) => {
    const visit = (parent: Parents) => {
      parent.children.forEach((child, index) => {
        if (child.type !== 'element') return;
        const math = mathOf(child);
        if (math) parent.children[index] = render(math.tex, math.display, file);
        else visit(child);
      });
    };
    visit(tree);
  };
}

/** remark-math gives `<code class="math-inline">` and `<pre><code class="math-display">`. */
function mathOf(node: Element): { tex: string; display: boolean } | undefined {
  const code =
    node.tagName === 'pre' && node.children.length === 1 && node.children[0]?.type === 'element'
      ? node.children[0]
      : node;
  const classes = code.tagName === 'code' ? code.properties.className : undefined;
  if (!Array.isArray(classes) || !classes.includes('language-math')) return undefined;
  const tex = code.children.map((child) => (child.type === 'text' ? child.value : '')).join('');
  return { tex, display: node !== code || classes.includes('math-display') };
}

function render(tex: string, display: boolean, file: VFile): ElementContent {
  let mathml: string;
  try {
    mathml = temml.renderToString(tex, {
      displayMode: display,
      annotate: true,
      throwOnError: true,
    });
  } catch (error) {
    file.message(`Could not render maths \`${tex}\`: ${String(error)}`, { source: 'rehype-temml' });
    mathml = temml.renderToString(tex, { displayMode: display, throwOnError: false });
  }
  const math = fromHtml(mathml, { fragment: true }).children.filter(
    (node): node is Element => node.type === 'element'
  );
  if (!display) return math[0] ?? { type: 'text', value: tex };
  // A long equation scrolls sideways in its own box instead of widening the page.
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['math-display'] },
    children: math,
  };
}
