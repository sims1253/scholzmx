/**
 * Turns `> margin: …` blockquotes into margin notes at build time:
 *
 *   > margin: Chunk options go after `#|`.
 *
 * becomes `<aside class="margin-note"><p>Chunk options go after <code>#|</code>.</p></aside>`
 * in the blockquote's place. The note belongs to the block that follows it, as with
 * Quarto's `.column-margin`: CSS floats it into the right margin level with that block
 * on wide screens and sets it as a boxed note in the text column on narrow ones
 * (src/styles/margin-notes.css). Markup inside the note (code, links, emphasis) is kept.
 */
import type { Blockquote, Paragraph, Parent, Root, Text } from 'mdast';

const PREFIX = /^\s*margin:\s*/i;

export default function remarkMarginNotes() {
  return (tree: Root) => {
    convert(tree);
  };
}

function convert(parent: Parent): void {
  for (const child of parent.children) {
    const opening = child.type === 'blockquote' ? openingText(child) : null;
    if (opening && PREFIX.test(opening.text.value)) {
      opening.text.value = opening.text.value.replace(PREFIX, '');
      if (opening.text.value === '') opening.paragraph.children.shift();
      child.data = { ...child.data, hName: 'aside', hProperties: { className: ['margin-note'] } };
    } else if ('children' in child) {
      convert(child);
    }
  }
}

/** The text that opens the blockquote's first paragraph, if it opens with text. */
function openingText(blockquote: Blockquote): { paragraph: Paragraph; text: Text } | null {
  const paragraph = blockquote.children[0];
  if (paragraph?.type !== 'paragraph') return null;
  const text = paragraph.children[0];
  return text?.type === 'text' ? { paragraph, text } : null;
}
