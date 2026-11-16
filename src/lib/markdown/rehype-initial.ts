/**
 * Gives a post or recipe its drop-cap initial at build time, so authors write plain prose.
 *
 * The first paragraph that holds text gets the ornament element from ./initial.ts as its
 * first child; its first letter stays where it is and CSS sets it as the initial. Rules:
 * - A paragraph that opens with an emphasised label such as `*Update:*` is an editorial
 *   note, not the start of the text; the initial goes to the paragraph after it.
 * - The letter may sit inside a link or emphasis.
 * - A one-letter first word ("A story", "I am") keeps its space as a no-break space;
 *   an ordinary space would collapse at the start of the line, beside the floated
 *   initial, and screen readers and the clipboard would get "Astory".
 * - Punctuation right after the letter ("I'm") is kept out of the initial (joinInitial).
 * - Opening quotation marks before it are wrapped in `.dropcap-quote` and hung in the
 *   margin, so the initial is still the letter.
 * - A paragraph that opens with anything else (a digit, code, math) gets no initial.
 * - `dropcap: false` in the front matter opts a page out.
 */
/// <reference types="@astrojs/markdown-remark" />
import type { Element, ElementContent, Root, Text } from 'hast';
import type { VFile } from 'vfile';
import { initialAttributes, joinInitial, type InitialVariant } from './initial.ts';

export interface RehypeInitialOptions {
  /** Which content collections get an initial, keyed by folder under src/content/. */
  collections: Record<string, InitialVariant>;
}

/** Inline elements the first letter may sit in. Anything else ends the search. */
const PASS_THROUGH = new Set(['a', 'em', 'strong', 'i', 'b', 'mark', 'cite', 'u', 's']);
const OPENING_QUOTES = /^[\s"'“‘„‚«‹»›]+/u;
const LETTER = /^\p{L}/u;
const ONE_LETTER_WORD = /^(\p{L})\s+/u;
const LABEL = new Set(['em', 'strong', 'i', 'b']);

export default function rehypeInitial(options: RehypeInitialOptions) {
  return (tree: Root, file: VFile) => {
    const variant = variantFor(file, options);
    if (!variant) return;
    const paragraph = tree.children.find(
      (node): node is Element =>
        node.type === 'element' && node.tagName === 'p' && hasText(node) && !opensWithLabel(node)
    );
    if (paragraph) decorate(paragraph, variant);
  };
}

function variantFor(file: VFile, { collections }: RehypeInitialOptions): InitialVariant | null {
  if (file.data.astro?.frontmatter?.dropcap === false) return null;
  const path = file.path.replaceAll('\\', '/');
  for (const [collection, variant] of Object.entries(collections)) {
    if (path.includes(`/content/${collection}/`)) return variant;
  }
  return null;
}

/** Adds the initial to `paragraph` and reports whether it could. */
export function decorate(paragraph: Element, variant: InitialVariant): boolean {
  const found = firstText(paragraph);
  if (!found) return false;
  const { text, parent } = found;
  const quotes = OPENING_QUOTES.exec(text.value)?.[0] ?? '';
  const rest = text.value.slice(quotes.length);
  if (!LETTER.test(rest)) return false;

  text.value = joinInitial(rest.charAt(0), rest.slice(1)).replace(ONE_LETTER_WORD, '$1\u00A0');
  const hung = quotes.trim();
  if (hung) {
    parent.children.splice(parent.children.indexOf(text), 0, {
      type: 'element',
      tagName: 'span',
      properties: { className: ['dropcap-quote'] },
      children: [{ type: 'text', value: hung }],
    });
  }

  const attributes = initialAttributes(rest, { style: 'ornate', variant });
  paragraph.children.unshift({
    type: 'element',
    tagName: 'span',
    properties: {
      className: attributes.class.split(' '),
      dataFirstLetter: attributes['data-first-letter'],
      ariaHidden: attributes['aria-hidden'],
    },
    children: [],
  });
  return true;
}

/** The first text with something visible in it, if only pass-through elements lead to it. */
function firstText(parent: Element): { text: Text; parent: Element } | null {
  for (const child of parent.children) {
    if (child.type === 'comment') continue;
    if (child.type === 'text') {
      if (child.value.trim() === '') continue;
      return { text: child, parent };
    }
    if (child.type === 'element' && PASS_THROUGH.has(child.tagName)) return firstText(child);
    return null;
  }
  return null;
}

/** Whether the paragraph opens with an emphasised label ending in a colon: *Update:* */
function opensWithLabel(paragraph: Element): boolean {
  const first = paragraph.children.find((child) => child.type !== 'text' || child.value.trim());
  if (first?.type !== 'element' || !LABEL.has(first.tagName)) return false;
  return /:\s*$/.test(textOf(first));
}

function textOf(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

function hasText(node: ElementContent | Element): boolean {
  if (node.type === 'text') return node.value.trim() !== '';
  if (node.type === 'element') return node.children.some(hasText);
  return false;
}
