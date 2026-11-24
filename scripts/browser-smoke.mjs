import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { site } from './address-check.mjs';

const baseURL = process.env.SITE_TEST_URL || 'http://127.0.0.1:4321';
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
});
// How each sheet with lines keeps its writing to them. A zero-height inline-block set after
// each word has its bottom edge on that line's baseline, which belongs a pixel above the
// top edge of a rule. Runs in the page.
function linesOnRules(lined) {
  const style = document.createElement('style');
  style.textContent =
    '* { transition: none !important; animation: none !important } .line-mark { display: inline-block; width: 0; height: 0 }';
  document.head.append(style);
  return lined.map((card) => {
    // Lay the sheet flat, so its own coordinates are the page's.
    card.style.setProperty('--sc-turn', '0deg');
    card.style.setProperty('--sc-lift', '0px');
    const content = card.querySelector('.sc-content');
    const face = card.querySelector('.sc-face');
    const pitch = Number.parseFloat(getComputedStyle(content).lineHeight);
    // Squared paper has a line to half a pitch: the writing sits on every other one.
    const period = card.dataset.ruling === 'squared' ? pitch / 2 : pitch;
    // The sheet's colour is the last layer painted on its face; its lines come just before.
    const lines = getComputedStyle(face).backgroundPosition.split(',').at(-2);
    const fromTop = Number.parseFloat(lines.trim().split(' ')[1]);
    const firstRule = 1 + fromTop + period - 1; // the face has a 1px border
    const texts = [];
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node);
    for (const node of texts) {
      if (!/\S/.test(node.data)) continue;
      const words = document.createDocumentFragment();
      node.data.split(/(\s+)/).forEach((part, index) => {
        if (index % 2) words.append(part);
        else if (part) {
          words.append(part);
          const mark = document.createElement('i');
          mark.className = 'line-mark';
          words.append(mark);
        }
      });
      node.replaceWith(words);
    }
    const top = card.getBoundingClientRect().top;
    const off = [...content.querySelectorAll('.line-mark')].map((mark) => {
      const baseline = mark.getBoundingClientRect().bottom - top;
      const distance = (((baseline + 1 - firstRule) % period) + period) % period;
      return Math.abs(distance > period / 2 ? distance - period : distance);
    });
    const height = card.offsetHeight;
    const remainder = ((height % pitch) + pitch) % pitch;
    // How much of its words the face cuts off. It keeps stains to the sheet, so it is also
    // what clips words that do not fit; a stain running off the edge is meant to.
    const cutOff = () => content.offsetHeight - face.clientHeight;
    const overflow = cutOff();
    // Nor when its row allows less than its words: clamped hard, the sheet keeps them.
    card.style.maxHeight = '1px';
    const clamped = cutOff();
    card.style.removeProperty('max-height');
    return {
      ruling: card.dataset.ruling,
      title: content.querySelector('.sc-title')?.textContent.trim().slice(0, 30),
      lines: off.length,
      off: Math.round(Math.max(0, ...off) * 100) / 100,
      heightOff: Math.round(Math.min(remainder, pitch - remainder) * 100) / 100,
      overflow: Math.round(Math.max(overflow, clamped) * 100) / 100,
    };
  });
}

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
      if (path === '/blog/' || path === '/recipes/' || path === '/research/') {
        // On a sheet with lines to write on, the writing sits on them: every baseline a
        // pixel above a rule, the sheet a whole number of pitches tall, nothing past its foot.
        const lined = await page.$$eval('.sc-card[data-lined]', linesOnRules);
        assert.ok(
          lined.length > 0 &&
            lined.every(
              (sheet) => sheet.off <= 0.75 && sheet.heightOff <= 0.6 && sheet.overflow <= 0
            ),
          `Writing off its lines on ${path} at ${width}px: ${JSON.stringify(lined)}`
        );
      }
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
    'Browser smoke checks passed: routes, mobile layout, theme, images, search, RSS, sitemap, lined cards.'
  );
} finally {
  await browser.close();
}
