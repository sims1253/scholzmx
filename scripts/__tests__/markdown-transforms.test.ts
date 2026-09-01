import { describe, it, expect } from 'vitest';
import {
  convertFiguresToMarkdown,
  fixImagePaths,
  removeDuplicateTitleDate,
  extractOutputFromDetails,
} from '../markdown-transforms';

// ============================================
// convertFiguresToMarkdown Tests
// ============================================

describe('convertFiguresToMarkdown', () => {
  it('converts figure with img and figcaption to markdown image with caption', () => {
    const content = `<figure>
<img src="./plot.png" alt="A plot" />
<figcaption aria-hidden="true">A plot</figcaption>
</figure>`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe('![A plot](./plot.png)\n*A plot*');
  });

  it('handles multi-line img tag', () => {
    const content = `<figure>
<img
src="./median-test-1.png"
alt="Density plots for symmetric, asymmetric, and bathtub Kumaraswamy distributions" />
<figcaption aria-hidden="true">Density plots for symmetric, asymmetric,
and bathtub Kumaraswamy distributions</figcaption>
</figure>`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe(
      '![Density plots for symmetric, asymmetric, and bathtub Kumaraswamy distributions](./median-test-1.png)\n' +
        '*Density plots for symmetric, asymmetric, and bathtub Kumaraswamy distributions*'
    );
  });

  it('handles multi-line figcaption', () => {
    const content = `<figure>
<img src="./menu.png"
alt="A screenshot showing the daily menu post" />
<figcaption aria-hidden="true">A screenshot showing the daily menu
post</figcaption>
</figure>`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe(
      '![A screenshot showing the daily menu post](./menu.png)\n' +
        '*A screenshot showing the daily menu post*'
    );
  });

  it('converts figure without figcaption to image only', () => {
    const content = `<figure>
<img src="./plot.png" alt="Plot" />
</figure>`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe('![Plot](./plot.png)');
  });

  it('passes through figure without img unchanged', () => {
    const content = `<figure>
<video src="./demo.mp4" />
<figcaption>A video</figcaption>
</figure>`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe(content);
  });

  it('handles multiple sequential figures', () => {
    const content = `<figure>
<img src="./first.png" alt="First" />
<figcaption aria-hidden="true">First</figcaption>
</figure>

<figure>
<img src="./second.png" alt="Second" />
<figcaption aria-hidden="true">Second</figcaption>
</figure>`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe('![First](./first.png)\n*First*\n\n![Second](./second.png)\n*Second*');
  });

  it('passes through figure with no src attribute unchanged', () => {
    const content = `<figure>
<img alt="No source" />
</figure>`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe(content);
  });

  it('returns content without figures unchanged', () => {
    const content = `# Hello

Some paragraph with ![](./image.png) inline.

More text.`;

    expect(convertFiguresToMarkdown(content)).toBe(content);
  });

  it('handles empty content', () => {
    expect(convertFiguresToMarkdown('')).toBe('');
  });

  it('preserves unclosed figure as raw lines', () => {
    const content = `<figure>
<img src="./plot.png" alt="Oops" />
No closing tag`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe(content);
  });

  it('handles img without alt attribute', () => {
    const content = `<figure>
<img src="./plot.png" />
<figcaption aria-hidden="true">Caption only</figcaption>
</figure>`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe('![](./plot.png)\n*Caption only*');
  });

  it('preserves surrounding content', () => {
    const content = `Some text before.

<figure>
<img src="./plot.png" alt="Plot" />
<figcaption aria-hidden="true">Plot</figcaption>
</figure>

Some text after.`;

    const result = convertFiguresToMarkdown(content);
    expect(result).toBe('Some text before.\n\n![Plot](./plot.png)\n*Plot*\n\nSome text after.');
  });
});

// ============================================
// fixImagePaths Tests
// ============================================

describe('fixImagePaths', () => {
  describe('index_files paths', () => {
    it('converts index_files/figure-markdown_str-1-1/image.png to ./image.png', () => {
      const content = '![](index_files/figure-markdown_str-1-1/plot-1.png)';
      expect(fixImagePaths(content)).toBe('![](./plot-1.png)');
    });

    it('handles index_files with different subdirectory names', () => {
      const content = '![](index_files/figure-html/ggplot-output.png)';
      expect(fixImagePaths(content)).toBe('![](./ggplot-output.png)');
    });

    it('converts index.markdown_strict_files paths to ./image.png', () => {
      const content = '![](index.markdown_strict_files/figure-markdown_strict/plot-1.png)';
      expect(fixImagePaths(content)).toBe('![](./plot-1.png)');
    });

    it('converts html src paths for index.markdown_strict_files', () => {
      const content =
        '<img src="index.markdown_strict_files/figure-markdown_strict/sample-plot-1.png" />';
      expect(fixImagePaths(content)).toBe('<img src="./sample-plot-1.png" />');
    });
  });

  describe('src/assets paths', () => {
    it('converts src/assets/images/blog/2022/03-14-post/image.png to ./image.png', () => {
      const content = '![](src/assets/images/blog/2022/03-14-post/chart.png)';
      expect(fixImagePaths(content)).toBe('![](./chart.png)');
    });

    it('handles different year and post folder names', () => {
      const content = '![](src/assets/images/blog/2024/12-25-holiday/photo.jpg)';
      expect(fixImagePaths(content)).toBe('![](./photo.jpg)');
    });
  });

  describe('relative paths with parent directories', () => {
    it('converts ../../../../assets/images/blog/2022/03-14-post/image.png to ./image.png', () => {
      const content = '![](../../../../assets/images/blog/2022/03-14-post/graphic.svg)';
      expect(fixImagePaths(content)).toBe('![](./graphic.svg)');
    });
  });

  describe('absolute paths starting with /assets', () => {
    it('converts /assets/images/blog/2022/03-14-post/image.png to ./image.png', () => {
      const content = '![](/assets/images/blog/2022/03-14-post/banner.webp)';
      expect(fixImagePaths(content)).toBe('![](./banner.webp)');
    });
  });

  describe('plain image references', () => {
    it('converts plain image.png (no path) to ./image.png', () => {
      const content = '![](standalone-image.png)';
      expect(fixImagePaths(content)).toBe('![](./standalone-image.png)');
    });

    it('does not convert filenames with dots in the middle incorrectly', () => {
      const content = '![](my.file.name.png)';
      expect(fixImagePaths(content)).toBe('![](./my.file.name.png)');
    });
  });

  describe('already relative paths', () => {
    it('keeps ./image.png as-is (already relative)', () => {
      const content = '![](./already-relative.png)';
      expect(fixImagePaths(content)).toBe('![](./already-relative.png)');
    });
  });

  describe('multiple images in content', () => {
    it('handles multiple images in one content block', () => {
      const content = `Here is an image:

![](index_files/figure-html/first.png)

And another:

![](/assets/images/blog/2022/03-14-post/second.jpg)

Plus this one:

![](plain-image.gif)`;

      const expected = `Here is an image:

![](./first.png)

And another:

![](./second.jpg)

Plus this one:

![](./plain-image.gif)`;

      expect(fixImagePaths(content)).toBe(expected);
    });
  });

  describe('different image extensions', () => {
    it('handles PNG extension', () => {
      expect(fixImagePaths('![](image.png)')).toBe('![](./image.png)');
    });

    it('handles JPG extension', () => {
      expect(fixImagePaths('![](image.jpg)')).toBe('![](./image.jpg)');
    });

    it('handles JPEG extension', () => {
      expect(fixImagePaths('![](image.jpeg)')).toBe('![](./image.jpeg)');
    });

    it('handles GIF extension', () => {
      expect(fixImagePaths('![](image.gif)')).toBe('![](./image.gif)');
    });

    it('handles SVG extension', () => {
      expect(fixImagePaths('![](image.svg)')).toBe('![](./image.svg)');
    });

    it('handles WEBP extension', () => {
      expect(fixImagePaths('![](image.webp)')).toBe('![](./image.webp)');
    });

    it('converts uppercase extensions', () => {
      expect(fixImagePaths('![](image.PNG)')).toBe('![](./image.PNG)');
      expect(fixImagePaths('![](image.JPG)')).toBe('![](./image.JPG)');
    });
  });

  describe('remote URLs', () => {
    it('does not modify http URLs', () => {
      const content = '![](http://example.com/image.png)';
      expect(fixImagePaths(content)).toBe(content);
    });

    it('does not modify https URLs', () => {
      const content = '![](https://example.com/path/to/image.jpg)';
      expect(fixImagePaths(content)).toBe(content);
    });

    it('does not modify URLs with query parameters', () => {
      const content = '![](https://example.com/image.png?size=large)';
      expect(fixImagePaths(content)).toBe(content);
    });
  });

  describe('images with alt text', () => {
    it('preserves alt text in image references', () => {
      const content = '![A descriptive alt text](index_files/figure-html/plot.png)';
      // Note: The current implementation only handles ![]() patterns without alt text
      // This test documents current behavior
      expect(fixImagePaths(content)).toBe('![A descriptive alt text](./plot.png)');
    });
  });

  describe('images with title attribute', () => {
    it('converts title to visible caption', () => {
      const content = '![Alt text](./image.png "Visible caption")';
      expect(fixImagePaths(content)).toBe('![Alt text](./image.png)\n\n*Visible caption*');
    });

    it('handles title with path normalization', () => {
      const content = '![Alt text](index_files/figure-html/plot.png "My caption")';
      expect(fixImagePaths(content)).toBe('![Alt text](./plot.png)\n\n*My caption*');
    });

    it('leaves images without title unchanged', () => {
      const content = '![Alt text](./image.png)';
      expect(fixImagePaths(content)).toBe(content);
    });

    it('handles title with special characters', () => {
      const content = '![Alt](./img.png "Caption with special chars: & < >")';
      expect(fixImagePaths(content)).toBe(
        '![Alt](./img.png)\n\n*Caption with special chars: & < >*'
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty content', () => {
      expect(fixImagePaths('')).toBe('');
    });

    it('handles content without images', () => {
      const content = 'Just some text without any images.';
      expect(fixImagePaths(content)).toBe(content);
    });

    it('handles images with underscores in filenames', () => {
      const content = '![](my_awesome_plot_v2.png)';
      expect(fixImagePaths(content)).toBe('![](./my_awesome_plot_v2.png)');
    });

    it('handles images with hyphens in filenames', () => {
      const content = '![](my-plot-final-version.png)';
      expect(fixImagePaths(content)).toBe('![](./my-plot-final-version.png)');
    });
  });
});

// ============================================
// removeDuplicateTitleDate Tests
// ============================================

describe('removeDuplicateTitleDate', () => {
  describe('duplicate title removal', () => {
    it('removes duplicate title # My Title when frontmatter has title: "My Title"', () => {
      const content = `---
title: "My Title"
date: 2022-03-14
---

# My Title

This is the actual content.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).not.toContain('# My Title');
      expect(result).toContain('This is the actual content.');
    });

    it("removes duplicate title with single quotes title: 'My Title'", () => {
      const content = `---
title: 'Another Title'
---

# Another Title

Content here.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).not.toContain('# Another Title');
      expect(result).toContain('Content here.');
    });

    it('removes title without quotes', () => {
      const content = `---
title: Unquoted Title
---

# Unquoted Title

Body text.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).not.toContain('# Unquoted Title');
      expect(result).toContain('Body text.');
    });
  });

  describe('date removal', () => {
    it('removes standalone date line 2022-03-14 after frontmatter', () => {
      const content = `---
title: "Test"
---

2022-03-14

Real content starts here.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).not.toContain('2022-03-14');
      expect(result).toContain('Real content starts here.');
    });

    it('does not remove dates that are part of content', () => {
      const content = `---
title: "Test"
---

The important date was 2022-03-14 in history.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).toContain('2022-03-14');
    });
  });

  describe('author line removal', () => {
    it('removes author line pattern John Doe when it appears after frontmatter', () => {
      const content = `---
title: "Test"
---

John Doe

Actual content.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).not.toContain('John Doe');
      expect(result).toContain('Actual content.');
    });

    it('removes author after duplicate title and date', () => {
      const content = `---
title: "My Post"
---

# My Post

2022-03-14

Jane Smith

The real article content.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).not.toContain('# My Post');
      expect(result).not.toContain('2022-03-14');
      expect(result).not.toContain('Jane Smith');
      expect(result).toContain('The real article content.');
    });
  });

  describe('content preservation', () => {
    it('preserves actual content after cleaning', () => {
      const content = `---
title: "Sample"
---

# Sample

First paragraph.

Second paragraph with **bold**.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).toContain('First paragraph.');
      expect(result).toContain('Second paragraph with **bold**.');
    });

    it('preserves frontmatter intact', () => {
      const content = `---
title: "Keep Frontmatter"
description: "This should stay"
date: 2024-01-15
---

# Keep Frontmatter

Content.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).toContain('title: "Keep Frontmatter"');
      expect(result).toContain('description: "This should stay"');
      expect(result).toContain('date: 2024-01-15');
    });
  });

  describe('edge cases', () => {
    it('handles content without duplicate title', () => {
      const content = `---
title: "Unique"
---

This content has no duplicate title.`;

      const result = removeDuplicateTitleDate(content);

      expect(result).toContain('This content has no duplicate title.');
    });

    it('handles content without frontmatter', () => {
      const content = `# Just a Title

Some content without frontmatter.`;

      const result = removeDuplicateTitleDate(content);

      // Without frontmatter, nothing should be removed
      expect(result).toContain('# Just a Title');
      expect(result).toContain('Some content without frontmatter.');
    });

    it('handles empty content', () => {
      expect(removeDuplicateTitleDate('')).toBe('');
    });

    it('handles frontmatter only', () => {
      const content = `---
title: "Only Frontmatter"
---`;

      const result = removeDuplicateTitleDate(content);

      expect(result).toBe(content);
    });

    it('does not remove title that differs from frontmatter', () => {
      const content = `---
title: "Official Title"
---

# Different Heading

Content.`;

      const result = removeDuplicateTitleDate(content);

      // Different heading should not be removed
      expect(result).toContain('# Different Heading');
    });
  });
});

// ============================================
// extractOutputFromDetails Tests
// ============================================

describe('extractOutputFromDetails', () => {
  describe('basic extraction', () => {
    it('extracts output after code block inside <details class="code-collapse">', () => {
      const content = `<details class="code-collapse">
<summary>Code</summary>

\`\`\`r
print("hello")
\`\`\`

## [1] "hello"

</details>`;

      const result = extractOutputFromDetails(content);

      // Code should stay inside details
      expect(result).toContain('<details class="code-collapse">');
      expect(result).toContain('print("hello")');
      expect(result).toContain('</details>');
      // Output should be moved outside
      expect(result).toContain('## [1] "hello"');

      // Verify output is after closing tag
      const closeDetailsIndex = result.indexOf('</details>');
      const outputIndex = result.indexOf('## [1] "hello"');
      expect(outputIndex).toBeGreaterThan(closeDetailsIndex);
    });

    it('keeps code block inside details element', () => {
      const content = `<details class="code-collapse">
<summary>Show Code</summary>

\`\`\`python
x = 42
print(x)
\`\`\`

</details>`;

      const result = extractOutputFromDetails(content);

      expect(result).toContain('<details class="code-collapse">');
      expect(result).toContain('x = 42');
      expect(result).toContain('</details>');
    });
  });

  describe('non-code output extraction', () => {
    it('moves non-code output outside details element', () => {
      const content = `<details class="code-collapse">
<summary>R Code</summary>

\`\`\`r
sum(1:5)
\`\`\`

[1] 15

</details>

Next paragraph.`;

      const result = extractOutputFromDetails(content);

      // Output should appear after details closing tag
      const parts = result.split('</details>');
      const afterDetails = parts[1] || '';

      expect(afterDetails).toContain('[1] 15');
    });
  });

  describe('multiple details blocks', () => {
    it('handles multiple details blocks', () => {
      const content = `<details class="code-collapse">
<summary>First</summary>

\`\`\`r
1 + 1
\`\`\`

[1] 2

</details>

Some text between.

<details class="code-collapse">
<summary>Second</summary>

\`\`\`r
2 + 2
\`\`\`

[1] 4

</details>`;

      const result = extractOutputFromDetails(content);

      expect(result).toContain('[1] 2');
      expect(result).toContain('[1] 4');
      expect(result).toContain('Some text between.');
    });
  });

  describe('nested code blocks', () => {
    it('handles nested code blocks correctly', () => {
      const content = `<details class="code-collapse">
<summary>Code with markdown</summary>

\`\`\`markdown
# This is inside the code block

\`\`\`

</details>`;

      const result = extractOutputFromDetails(content);

      // The nested content should stay inside the code block
      expect(result).toContain('# This is inside the code block');
    });

    it('handles code blocks with language specification', () => {
      const content = `<details class="code-collapse">
\`\`\`javascript
console.log("test");
\`\`\`

Output line

</details>`;

      const result = extractOutputFromDetails(content);

      expect(result).toContain('console.log("test");');
      expect(result).toContain('Output line');
    });
  });

  describe('content outside details blocks', () => {
    it('preserves content outside details blocks', () => {
      const content = `# Main Heading

This is regular markdown.

<details class="code-collapse">
\`\`\`r
code here
\`\`\`

output

</details>

More regular content.`;

      const result = extractOutputFromDetails(content);

      expect(result).toContain('# Main Heading');
      expect(result).toContain('This is regular markdown.');
      expect(result).toContain('More regular content.');
    });
  });

  describe('edge cases', () => {
    it('handles empty content', () => {
      expect(extractOutputFromDetails('')).toBe('');
    });

    it('handles content without details blocks', () => {
      const content = `Just regular content

\`\`\`r
some_code()
\`\`\`

No details wrapper.`;

      const result = extractOutputFromDetails(content);

      expect(result).toBe(content);
    });

    it('handles details block with no code', () => {
      const content = `<details class="code-collapse">
<summary>Just text</summary>

No code here, just text.

</details>`;

      const result = extractOutputFromDetails(content);

      // Without a code block, content stays in details
      expect(result).toContain('No code here, just text.');
    });

    it('handles details block with only code (no output)', () => {
      const content = `<details class="code-collapse">
\`\`\`r
code_only()
\`\`\`

</details>`;

      const result = extractOutputFromDetails(content);

      expect(result).toContain('code_only()');
      expect(result).toContain('<details class="code-collapse">');
      expect(result).toContain('</details>');
    });

    it('handles non-code-collapse details blocks', () => {
      const content = `<details>
<summary>Regular details</summary>

Content inside regular details.

</details>`;

      const result = extractOutputFromDetails(content);

      // Non-code-collapse details should be preserved as-is
      expect(result).toBe(content);
    });
  });
});
