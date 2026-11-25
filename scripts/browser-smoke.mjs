import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { site } from './address-check.mjs';

// What each card is papered with, as the browser computed it: for the sheet on top and for
// the one under it, the image of every layer of background and that layer's size. A data
// URI holds commas of its own, so layers are split where a new one begins. Runs in the page.
function paperOf(cards) {
  const layers = (style) => ({
    images: style.backgroundImage.split(
      /,\s*(?=(?:url\("|(?:repeating-)?(?:linear|radial|conic)-gradient\(|none\b))/
    ),
    sizes: style.backgroundSize.split(', '),
  });
  return cards.map((card) => {
    return {
      tint: card.dataset.tint,
      top: layers(getComputedStyle(card.querySelector('.sc-face'))),
      // A card that is one sheet has only a shadow under it, not paper.
      under: card.dataset.layers === '1' ? null : layers(getComputedStyle(card, '::before')),
    };
  });
}

// The desk's own tiles of noise, as the browser holds them in the theme at hand: the tooth
// it is papered with, and its faint tile. Runs in the page.
function deskOf() {
  const style = getComputedStyle(document.body);
  return { tooth: style.backgroundImage, faint: style.getPropertyValue('--paper-tooth-faint') };
}

// A tile of noise as text: the SVG of its data URI, decoded, its whitespace made one. Two
// tiles are the same when all of them is, not only their frequency and their matrix.
function tileOf(image) {
  const data = /url\((["']?)(data:image\/svg\+xml,[\s\S]*?)\1\)/.exec(image ?? '');
  if (!data) return null;
  try {
    return decodeURIComponent(data[2]).replace(/\s+/g, ' ');
  } catch {
    return null;
  }
}

// A tile's matrix, the twenty numbers that turn its noise into grain, and the tile without
// it. The last row of the matrix is the grain's strength.
function matrixOf(tile) {
  const cut = / values='([^']*)'/.exec(tile ?? '');
  // Trimmed first: an empty entry would count as a zero, since Number('') is 0.
  const matrix = cut?.[1].trim().split(/\s+/).map(Number);
  return matrix?.length === 20 && matrix.every(Number.isFinite)
    ? { matrix, rest: tile.replace(cut[0], '') }
    : null;
}

// Whether one tile is another at half the strength: the same tile in every other part.
function halfStrength(one, other) {
  const a = matrixOf(one);
  const b = matrixOf(other);
  return (
    !!a &&
    !!b &&
    a.rest === b.rest &&
    a.matrix.every((value, at) => Math.abs(value - b.matrix[at] * (at >= 15 ? 0.5 : 1)) < 1e-9)
  );
}

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
      // A sheet is the desk's own rag paper, in either theme: it carries the desk's tooth,
      // one layer of it and no other, at its own size, whatever else is printed on the
      // sheet; an aged one its mottle too; and so does the sheet under it. None of it is
      // fetched. Both themes are tried by choice: left to the clock, a run by day would
      // never see a broken torchlit sheet, nor one by torchlight a broken day sheet.
      const TOOTH = "baseFrequency='.7'";
      const MOTTLE = "baseFrequency='.012'";
      const toothOf = (sheet) => {
        const teeth = sheet.images.flatMap((image, at) =>
          image.includes(TOOTH) ? [[tileOf(image), sheet.sizes[at]]] : []
        );
        return teeth.length === 1 ? teeth[0] : null;
      };
      const fetched = (card) =>
        [...card.top.images, ...(card.under?.images ?? [])].filter((image) =>
          /^url\(["']?(https?:|\/)/.test(image)
        );
      const mottleOf = (card) => {
        const at = card.top.images.findIndex((image) => image.includes(MOTTLE));
        return at === -1 ? null : card.top.sizes[at];
      };
      const papered = (card, tooth) => {
        const teeth = (card.under ? [card.top, card.under] : [card.top]).map(toothOf);
        return (
          teeth.every((own) => own && own[0] === tooth && own[1] === '256px 256px') &&
          fetched(card).length === 0 &&
          (card.tint !== 'aged' || mottleOf(card) === '320px 320px')
        );
      };
      // A card as the check reads it, for when it is off.
      const told = (card, tooth) => ({
        tint: card.tint,
        teeth: (card.under ? [card.top, card.under] : [card.top]).map((sheet) => {
          const own = toothOf(sheet);
          return own && `${own[0] === tooth ? "the desk's tile" : 'another tile'} at ${own[1]}`;
        }),
        mottle: card.tint === 'aged' ? mottleOf(card) : undefined,
        fetched: fetched(card),
      });
      const was = await page.$eval('html', (element) => element.getAttribute('data-theme'));
      for (const theme of ['light', 'dark']) {
        await page.$eval(
          'html',
          (element, theme) => element.setAttribute('data-theme', theme),
          theme
        );
        const desk = await page.$eval('body', deskOf);
        const paper = await page.$$eval('.sc-card', paperOf);
        const whole = tileOf(desk.tooth);
        const faint = tileOf(desk.faint);
        assert.ok(
          whole && faint,
          `A tile of the desk's noise is missing on ${path} at ${width}px, ${theme} by choice: ${JSON.stringify({ whole, faint })}`
        );
        // The faint tile is the desk's torchlit one at half the strength.
        assert.ok(
          theme === 'light' || halfStrength(faint, whole),
          `The desk's faint tile is not its torchlit one at half the strength on ${path} at ${width}px: ${JSON.stringify({ whole, faint })}`
        );
        // The tooth a sheet carries is the desk's own: its tile by day, its faint one by
        // torchlight.
        const tooth = theme === 'dark' ? faint : whole;
        assert.ok(
          paper.every((card) => papered(card, tooth)),
          `A sheet off the desk's paper on ${path} at ${width}px, ${theme} by choice: ${JSON.stringify(paper.map((card) => told(card, tooth)))}`
        );
      }
      await page.$eval(
        'html',
        (element, was) => {
          if (was === null) element.removeAttribute('data-theme');
          else element.setAttribute('data-theme', was);
        },
        was
      );
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
