import { describe, expect, it } from 'vitest';
import { runMarkdownTransformPipeline } from '../blog-build/postprocess';

describe('runMarkdownTransformPipeline integration', () => {
  it('rewrites hero and inline images, extracts code output, preserves margin notes', () => {
    const input = [
      '---',
      'title: "Pipeline Test"',
      'heroImage: ../../../../assets/images/blog/2026/01-01-example/hero.png',
      '---',
      '',
      '# Pipeline Test',
      '',
      '2026-01-01',
      '',
      '> margin: Keep this sidenote source unchanged.',
      '',
      '![](index_files/figure-html/plot-1.png)',
      '',
      '<details class="code-collapse">',
      '<summary>Code</summary>',
      '',
      '```r',
      '1 + 41',
      '```',
      '',
      '[1] 42',
      '',
      '</details>',
      '',
    ].join('\n');

    const output = runMarkdownTransformPipeline(input);

    expect(output).toContain('heroImage: ./hero.png');
    expect(output).toContain('![](./plot-1.png)');
    expect(output).toContain('> margin: Keep this sidenote source unchanged.');

    const detailsCloseIndex = output.indexOf('</details>');
    const outputIndex = output.indexOf('[1] 42');
    expect(outputIndex).toBeGreaterThan(detailsCloseIndex);
    expect(output).not.toContain('# Pipeline Test');
    expect(output).not.toContain('\n2026-01-01\n');
  });
});
