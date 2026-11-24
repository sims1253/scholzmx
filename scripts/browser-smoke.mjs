import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { site } from './address-check.mjs';

const baseURL = process.env.SITE_TEST_URL || 'http://127.0.0.1:4321';
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const errors = [];
try {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  const blogPaths = [...globSync('**/index.html', { cwd: 'dist/blog' })]
    .filter((path) => path !== 'index.html')
    .map((path) => `/blog/${path.replace(/index\.html$/, '')}`);
  const paths = ['/', '/blog/', '/recipes/', '/research/', '/projects/', ...blogPaths];
  for (const width of [1440, 1280, 390]) {
    await page.setViewport({ width, height: 844 });
    for (const path of paths) {
      const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle0' });
      assert.equal(response.status(), 200, path);
      assert.ok(await page.title(), `Missing title: ${path}`);
      if (path === '/' && width === 1440) {
        const client = await page.createCDPSession();
        const { root } = await client.send('DOM.getDocument');
        const { nodeId } = await client.send('DOM.querySelector', {
          nodeId: root.nodeId,
          selector: '#quote-wrapper-button',
        });
        const { nodes } = await client.send('Accessibility.getPartialAXTree', { nodeId });
        const button = nodes.find((node) => node.role?.value === 'button');
        const quote = await page.$eval('#quote-text', (element) => element.textContent);
        assert.ok(button?.name?.value.includes(quote.replace(/\s+/g, ' ').trim()));
        assert.equal(button.description?.value, 'Activate to display another quote.');
        await client.detach();
      }
      if (path === '/') {
        const portraits = await page.$eval('.image-frame.clickable', async (frame) => {
          const bounds = frame.getBoundingClientRect();
          const results = [];
          for (const image of frame.querySelectorAll('img')) {
            await image.decode();
            const rect = image.getBoundingClientRect();
            const ratio = image.naturalWidth / image.naturalHeight;
            let paintedWidth = rect.width;
            let paintedHeight = rect.height;
            if (getComputedStyle(image).objectFit === 'contain') {
              if (paintedWidth / paintedHeight > ratio) paintedWidth = paintedHeight * ratio;
              else paintedHeight = paintedWidth / ratio;
            }
            const left = rect.left + (rect.width - paintedWidth) / 2;
            const top = rect.top + (rect.height - paintedHeight) / 2;
            results.push({
              ratio,
              paintedBounds: [left - bounds.left, top - bounds.top, paintedWidth, paintedHeight],
              coversFrame:
                left <= bounds.left + 1 &&
                left + paintedWidth >= bounds.right - 1 &&
                top <= bounds.top + 1 &&
                top + paintedHeight >= bounds.bottom - 1,
            });
          }
          return results;
        });
        assert.equal(portraits.length, 2);
        assert.ok(
          portraits.every((portrait) => portrait.coversFrame),
          `Portrait gap at ${width}px`
        );
        // Painted bounds measured on the live homepage; allow one pixel for image resize rounding.
        const liveFraming =
          width === 390
            ? [
                [-5.2, -13.328, 130.4, 173.6],
                [-18.71, -3.5, 139.419, 210],
              ]
            : [
                [-12.35, -28.808, 224.7, 299.6],
                [-30, -5.75, 230, 345],
              ];
        for (const [index, portrait] of portraits.entries()) {
          for (const [dimension, value] of portrait.paintedBounds.entries()) {
            assert.ok(
              Math.abs(value - liveFraming[index][dimension]) < 1,
              `Portrait ${index} framing differs from live at ${width}px`
            );
          }
        }
        // The optimized assets must retain the original 3840×5120 and 1066×1600 ratios.
        assert.ok(Math.abs(portraits[0].ratio - 3840 / 5120) < 0.01);
        assert.ok(Math.abs(portraits[1].ratio - 1066 / 1600) < 0.01);
      }

      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `Horizontal overflow: ${path} at ${width}px`
      );
    }
  }

  // The initial is measured by its paragraph: three lines run beside it, the fourth runs
  // free, and its frame is three lines tall less the gap at its foot. The homepage sets
  // its bio smaller and closer in a short window, so a short and a tall window are tried,
  // and one with its leading loose enough that the frame stops at the fourth line instead.
  // A post opens in the other face, with a top of its own, so a post is measured too.
  const opening = (path) => readFileSync(`dist${path}index.html`, 'utf8');
  // A post whose opening paragraph runs to a fourth line, so that the fourth can be seen
  // to run free: among the posts that open with an initial, the first that does, or else
  // the first of all.
  await page.setViewport({ width: 1440, height: 844 });
  let postWithInitial;
  for (const path of blogPaths.filter(
    (path) => opening(path).includes('class="dropcap') && !opening(path).includes('dropcap--word')
  )) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle0' });
    const fourLines = await page.$eval('.dropcap', (element) => {
      const box = element.parentElement.getBoundingClientRect();
      return (
        box.height >= 4 * Number.parseFloat(getComputedStyle(element.parentElement).lineHeight)
      );
    });
    postWithInitial ??= path;
    if (fourLines) {
      postWithInitial = path;
      break;
    }
  }
  // A paragraph that opens with a one-letter word ("I always...") is a case of its own.
  const postWithOneLetterWord = blogPaths.find((path) => opening(path).includes('dropcap--word'));
  assert.ok(postWithInitial, 'No post opens with an initial');
  assert.ok(postWithOneLetterWord, 'No post opens with a one-letter word');
  // Where the top of the frame lies below the top of the first line: half a line, plus
  // half the difference of ascent and descent, less the height of the capitals; and how
  // wide a space is in that face.
  const alegreya = { slope: 0.3355, cap: 0.646, space: 0.198 };
  const etBook = { slope: 0.2937, cap: 0.653, space: 0.2446 };
  for (const { height, leading, path = '/', face } of [
    { height: 844, face: alegreya },
    { height: 1300, face: alegreya },
    { height: 844, leading: '2em', face: alegreya },
    { height: 844, path: postWithInitial, face: etBook },
    { height: 844, path: postWithOneLetterWord, face: etBook },
  ]) {
    await page.setViewport({ width: 1440, height });
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle0' });
    if (leading) {
      await page.addStyleTag({
        content: `.about p:has(> .dropcap) { line-height: ${leading} !important; }`,
      });
    }
    const initial = await page.evaluate((face) => {
      const element = document.querySelector('.dropcap');
      const paragraph = element.parentElement;
      const style = getComputedStyle(paragraph);
      const pitch = Number.parseFloat(style.lineHeight);
      const size = Number.parseFloat(style.fontSize);
      const gap = 0.6 * size;
      const top = 0.5 * pitch + (face.slope - face.cap) * size;
      const space = face.space * size;
      const box = paragraph.getBoundingClientRect();
      const frame = element.getBoundingClientRect();
      const words = [...paragraph.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      );
      const firstWord = document.createRange();
      firstWord.selectNodeContents(words);
      // Whether the paragraph's words are written at its left edge on a line (they are
      // not, beside the initial).
      const atLeftEdge = (line) => {
        const range = document.caretRangeFromPoint(box.left + 1, box.top + (line - 0.5) * pitch);
        const node = range?.startContainer;
        return Boolean(
          node?.nodeType === Node.TEXT_NODE && paragraph.contains(node) && !element.contains(node)
        );
      };
      return {
        side: frame.height,
        threeLines: 3 * pitch - Math.max(gap, top),
        top: frame.top,
        capLine: box.top + top,
        foot: frame.bottom,
        fourthLine: box.top + 3 * pitch,
        fromFrame: firstWord.getClientRects()[0].left - frame.right,
        gap,
        space,
        oneLetter: element.classList.contains('dropcap--word'),
        // How many lines the paragraph has. A short opening has no fourth line to run free.
        lines: Math.round(box.height / pitch),
        beside: [1, 2, 3].map(atLeftEdge),
        fourth: atLeftEdge(4),
      };
    }, face);
    const close = (a, b) => Math.abs(a - b) <= 1;
    const place = path === '/' ? `${height}px` : `a post, ${path}`;
    const where = `${place}${leading ? ` with ${leading} leading` : ''}`;
    assert.ok(
      close(initial.side, initial.threeLines),
      `Initial height at ${where}: ${initial.side}, three lines less the larger of the gap and the top ${initial.threeLines}`
    );
    assert.ok(
      close(initial.top, initial.capLine),
      `Initial top at ${where}: ${initial.top}, the first line's capitals ${initial.capLine}`
    );
    // The last pixel of the frame may touch the fourth line's box.
    assert.ok(
      initial.foot <= initial.fourthLine + 1,
      `Initial reaches into the fourth line at ${where}: ${initial.foot} over ${initial.fourthLine}`
    );
    // A paragraph that opens with a one-letter word keeps that word's space in some
    // engines and loses it in others, and its first line is pulled back by the space's
    // width either way. So its words may stand that much nearer the frame, and no nearer.
    const nearest = initial.oneLetter ? initial.gap - initial.space : initial.gap;
    assert.ok(
      initial.fromFrame >= nearest - 1 && initial.fromFrame <= initial.gap + 1,
      `Words beside the initial at ${where}: ${initial.fromFrame} from it, gap ${initial.gap}`
    );
    const beside = initial.beside.slice(0, Math.min(3, initial.lines));
    assert.deepEqual(
      beside,
      beside.map(() => false),
      `Lines beside the initial at ${where}: ${initial.beside}`
    );
    assert.ok(
      initial.lines < 4 || initial.fourth,
      `The fourth line does not run free at ${where}: ${JSON.stringify(initial)}`
    );
  }

  await page.goto(baseURL, { waitUntil: 'networkidle0' });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const theme = await page.$eval('html', (element) => element.dataset.theme);
  await page.click('#nav-theme-toggle');
  assert.notEqual(await page.$eval('html', (element) => element.dataset.theme), theme);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.notEqual(await page.$eval('html', (element) => element.dataset.theme), theme);
  await page.click('.image-frame.clickable');
  assert.equal(
    await page.$eval('.image-frame.clickable', (element) => element.getAttribute('aria-pressed')),
    'true'
  );

  for (const [path, term, prefix] of [
    ['/blog/', 'coala', '/blog/'],
    ['/recipes/', 'coffee', '/recipes/'],
  ]) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.pagefind-ui__search-input');
    // A first input event also covers paste, which does not emit keyup.
    await page.$eval(
      '.pagefind-ui__search-input',
      (input, value) => {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      term
    );
    if (path === '/recipes/') {
      assert.equal(await page.$eval('.nc-item', (card) => card.style.display), 'none');
    }
    await page.waitForSelector('.pagefind-ui__result-link');
    const links = await page.$$eval('.pagefind-ui__result-link', (elements) =>
      elements.map((element) => element.getAttribute('href'))
    );
    assert.ok(
      links.every((link) => link.startsWith(prefix)),
      `Search escaped ${prefix}: ${links.join(', ')}`
    );
  }

  // A recipe opens with the table where the table fits, and with the steps alone elsewhere.
  // The steps are the recipe: they show in both views.
  for (const [width, view] of [
    [1440, 'table'],
    [390, 'steps'],
  ]) {
    await page.setViewport({ width, height: 844 });
    await page.goto(`${baseURL}/recipes/hokkaido-dinner-rolls/`, { waitUntil: 'networkidle0' });
    const opened = await page.$eval('[data-recipe-card]', (card) => ({
      view: card.dataset.view,
      checked: card.querySelector('input[name="rc-view"]:checked')?.value,
      steps: card.querySelector('.rc-steps-view').getClientRects().length > 0,
      hidden:
        card.querySelector('.rc-table-wrap').scrollWidth -
        card.querySelector('.rc-table-wrap').clientWidth,
    }));
    assert.equal(opened.view, view, `Recipe view at ${width}px`);
    assert.equal(opened.checked, view, `Recipe view control at ${width}px`);
    if (view === 'table') assert.ok(opened.hidden <= 1, 'The opening table must not scroll');
    assert.ok(opened.steps, `The step list must show at ${width}px`);
  }
  // Force lazy images to load before checking their decoded dimensions.
  await page.$$eval('img', async (images) => {
    for (const image of images) {
      image.loading = 'eager';
      await image.decode();
    }
  });
  const socialImage = await page.$eval('meta[property="og:image"]', (element) => element.content);
  assert.equal(new URL(socialImage).origin, site);
  const imageResponse = await fetch(`${baseURL}${new URL(socialImage).pathname}`);
  assert.equal(imageResponse.status, 200, 'Social image must exist in the build');
  for (const path of ['/rss.xml', '/sitemap-index.xml', '/sitemap-0.xml']) {
    assert.equal((await fetch(`${baseURL}${path}`)).status, 200, path);
  }
  assert.deepEqual(errors, [], 'Browser errors or failed asset requests');
  console.log(
    'Browser smoke checks passed: routes, mobile layout, theme, images, search, RSS, sitemap.'
  );
} finally {
  await browser.close();
}
