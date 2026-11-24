import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { site } from './address-check.mjs';

const baseURL = process.env.SITE_TEST_URL || 'http://127.0.0.1:4321';
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
});
// Each project's badge as laid out, without its set or its turn: whether it is a regular
// hexagon with its point up, whether its picture covers its face and keeps its own
// proportions, and whether any paper is left behind it. Runs in the page.
function badgeState(badges) {
  return badges.map((badge) => {
    const face = badge.querySelector('.project-badge-face');
    const picture = badge.querySelector('img');
    // The picture is enlarged on purpose; read by how much from its transform.
    const scale = new DOMMatrix(getComputedStyle(picture).transform).a;
    const round = badge.classList.contains('project-badge--round');
    return {
      round,
      // A regular hexagon with its point up is as wide as the root of three over two of
      // its height.
      regular: Math.abs(badge.offsetWidth / badge.offsetHeight - 0.866) < 0.01,
      // A hexagonal picture reaches past its face both ways; a round one, set as the
      // medallion, along its width.
      fills: round
        ? picture.offsetWidth * scale >= face.offsetWidth
        : picture.offsetWidth * scale >= face.offsetWidth &&
          picture.offsetHeight * scale >= face.offsetHeight,
      // Stretched to its face, a picture would lose the proportions of its file.
      true:
        Math.abs(
          picture.offsetWidth / picture.offsetHeight - picture.naturalWidth / picture.naturalHeight
        ) < 0.01,
      // No sheet of paper behind it: its rim is a gradient, not a colour.
      pasted:
        badge.classList.contains('pasted') ||
        getComputedStyle(badge).backgroundColor !== 'rgba(0, 0, 0, 0)',
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
      if (path === '/projects/') {
        // A project's mark is a badge: cut to one regular hexagon, its picture running
        // under the rim in its own proportions, with no paper behind it.
        const badges = await page.$$eval('.project-badge', badgeState);
        assert.ok(
          badges.length > 0 &&
            badges.every((badge) => badge.regular && badge.fills && badge.true && !badge.pasted),
          `Badges off their cut on ${path} at ${width}px: ${JSON.stringify(badges)}`
        );
        // As a mouse crosses a tag, its badge turns toward it and its light moves; left
        // alone, both come to rest.
        const badge = await page.$('.project-badge');
        const tag = await badge.evaluateHandle((element) => element.closest('.sc-card'));
        const box = await tag.asElement().boundingBox();
        const state = () =>
          badge.evaluate((element) => [
            element.style.getPropertyValue('--light-x'),
            getComputedStyle(element).transform,
          ]);
        const atRest = await state();
        // The middle of the tag: a point near a corner may lie past its clipped edge. A
        // badge takes a moment to turn.
        const settle = () => new Promise((resolve) => setTimeout(resolve, 350));
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
        await settle();
        const lit = await state();
        assert.notEqual(lit[0], atRest[0], `The light does not move on ${path} at ${width}px`);
        assert.notEqual(lit[1], atRest[1], `A badge does not turn on ${path} at ${width}px`);
        await page.mouse.move(2, 2, { steps: 4 });
        await settle();
        assert.deepEqual(
          await state(),
          ['', atRest[1]],
          `A badge does not come to rest on ${path} at ${width}px`
        );
        // Under reduced motion it keeps its set, and only its light moves.
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await new Promise((resolve) => setTimeout(resolve, 300));
        const settled = await state();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
        await settle();
        const still = await state();
        assert.notEqual(still[0], '', 'The light does not move under reduced motion');
        assert.equal(
          still[1],
          settled[1],
          `A badge turns under reduced motion on ${path} at ${width}px`
        );
        await page.mouse.move(2, 2, { steps: 4 });
        await page.emulateMediaFeatures([]);
      }
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
