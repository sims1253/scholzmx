/**
 * The drop-cap initial: the one definition shared by the rehype plugin (posts, recipes)
 * and DropCap.astro (the homepage).
 *
 * The letter itself stays in the text, so "This" is one word to a screen reader and on
 * the clipboard; CSS sets it at size 0 with `p:has(> .dropcap)::first-letter`. The
 * element defined here draws the initial: it is empty, hidden from assistive technology,
 * and paints the letter and the ornament behind it from `data-first-letter`, both in
 * pseudo-elements of one box, so the two always register (src/styles/dropcap.css).
 */

export type InitialColor = 'gold' | 'walnut' | 'moss' | 'ochre' | 'sage';
export type InitialStyle = 'simple' | 'ornate' | 'botanical';
export type InitialVariant = 'personal' | 'serious';

export interface InitialOptions {
  /** Colours the ornament; without it the ornament takes --dropcap-color-background. */
  color?: InitialColor;
  style?: InitialStyle;
  variant?: InitialVariant;
}

/** The ornament's HTML attributes, as Astro and the hast tree both take them. */
export interface InitialAttributes {
  class: string;
  'data-first-letter': string;
  'aria-hidden': 'true';
}

/**
 * `text` is the text the initial opens: its first character is the letter. When the
 * letter is a word of its own ("A story"), the class `dropcap--word` lets CSS close the
 * gap the following space leaves beside the initial.
 */
export function initialAttributes(text: string, options: InitialOptions = {}): InitialAttributes {
  const { color, style = 'ornate', variant = 'personal' } = options;
  const classes = ['dropcap', `dropcap--${style}`, `dropcap--${variant}`];
  if (color) classes.push(`dropcap--${color}`);
  if (/^\p{L}\s/u.test(text)) classes.push('dropcap--word');
  return {
    class: classes.join(' '),
    'data-first-letter': text.charAt(0).toUpperCase(),
    'aria-hidden': 'true',
  };
}

/**
 * CSS counts punctuation right after the first letter as part of ::first-letter, so
 * "I'm" would set "I'" as the initial. A word joiner (U+2060) between them ends the
 * first letter without splitting the word: it is invisible and screen readers skip it.
 * Returns the letter followed by `rest`, joined when `rest` opens with punctuation.
 */
export function joinInitial(letter: string, rest: string): string {
  return /^\p{P}/u.test(rest) ? letter + WORD_JOINER + rest : letter + rest;
}

export const WORD_JOINER = '\u2060';
