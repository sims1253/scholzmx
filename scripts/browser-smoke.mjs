import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
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
        // Painted bounds measured on the live homepage; allow one pixel for image resize
        // rounding. A phone shows the portrait at the same size as a desk does.
        const liveFraming = [
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
  // A link reached with the keyboard shows a ring that can be seen.
  await page.focus('.niche-door');
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return {
      tag: document.activeElement.tagName,
      style: style.outlineStyle,
      width: style.outlineWidth,
    };
  });
  assert.deepEqual(ring, { tag: 'A', style: 'solid', width: '2px' }, 'Link focus ring');
  // The portrait has a second photo on its back; the button under it turns it over.
  await page.click('.frame-turn');
  assert.equal(
    await page.$eval('.frame-turn', (element) => element.getAttribute('aria-pressed')),
    'true'
  );
  assert.equal(
    await page.$eval('.image-frame.clickable .alternate-image', (element) =>
      element.getAttribute('aria-hidden')
    ),
    'false'
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

  // A recipe opens with the table where the table fits, and with the steps elsewhere:
  // two views of one recipe, one at a time.
  for (const [width, view] of [
    [1440, 'table'],
    [390, 'steps'],
  ]) {
    await page.setViewport({ width, height: 844 });
    await page.goto(`${baseURL}/recipes/hokkaido-dinner-rolls/`, { waitUntil: 'networkidle0' });
    const opened = await page.$eval('[data-recipe-card]', (card) => {
      const shown = (selector) => card.querySelector(selector).getClientRects().length > 0;
      return {
        table: shown('.rc-table-frame'),
        // Under the table only a picked step shows; the list has all of them.
        steps: shown('#rc-step-1'),
        hidden:
          card.querySelector('.rc-table-wrap').scrollWidth -
          card.querySelector('.rc-table-wrap').clientWidth,
      };
    });
    assert.equal(opened.table, view === 'table', `Recipe table at ${width}px`);
    assert.equal(opened.steps, view === 'steps', `Recipe steps at ${width}px`);
    if (view === 'table') assert.ok(opened.hidden <= 1, 'The opening table must not scroll');
  }
  // Half a batch makes whole rolls. Doubling leaves the story of what was tried alone.
  await page.click('input[name="rc-scale"][value="0.5"]');
  assert.equal(await page.$eval('[data-yield]', (element) => element.textContent), '7 or 8');
  await page.click('input[name="rc-scale"][value="2"]');
  assert.match(
    await page.$eval('#rc-step-3 .rc-notes', (element) => element.textContent),
    /below 50 g sugar.*above 100 g.*75 g hit/s
  );
  await page.click('input[name="rc-scale"][value="1"]');
  // Every picture says what it shows.
  assert.ok(
    await page.$$eval('.rc-photo img, .recipe-hero img', (images) =>
      images.every((image) => image.alt.length > 20)
    ),
    'Recipe pictures need alt text'
  );

  // Cooking on a phone: a step taller than the screen starts at its number and name.
  await page.click('[data-rc-start]');
  for (let step = 0; step < 3; step++) await page.click('[data-rc-next]');
  const knead = await page.$eval('#rc-step-3', (step) => step.getBoundingClientRect().top);
  assert.ok(knead >= 0 && knead < 120, `Knead starts at ${knead}px, not at the top`);
  // Starting a timer leaves the focus on the way on, and other steps' timers are chips
  // in the card's own dress. A timer can be cancelled.
  await page.click('[data-rc-timer]');
  assert.ok(await page.$eval('[data-rc-next]', (next) => next === document.activeElement));
  await page.click('[data-rc-next]');
  assert.equal(
    await page.$eval('.rc-timers button', (chip) => getComputedStyle(chip).borderRadius),
    '999px'
  );
  await page.click('.rc-timers button');
  await page.click('[data-rc-cancel]');
  assert.equal(await page.$('.rc-timers button'), null);
  assert.ok(await page.$eval('[data-rc-timer]', (start) => start === document.activeElement));
  // The bake is timed in its two stages, and its cue is right for both kinds of oven.
  for (let step = 0; step < 4; step++) await page.click('[data-rc-next]');
  assert.match(
    await page.$eval('[data-rc-timer]', (element) => element.textContent),
    /8 min, then 15 min/
  );
  assert.match(
    await page.$eval('[data-rc-announce]', (element) => element.textContent),
    /^Step 8 of 9: Bake/
  );
  await page.click('[data-rc-timer]');
  assert.match(
    await page.$eval('[data-rc-countdown-label]', (element) => element.textContent),
    /200 °C.*180 °C.*with convection/
  );
  // A reload in the middle of the bake keeps the step and its timer.
  await page.reload({ waitUntil: 'networkidle0' });
  assert.match(
    await page.$eval('[data-rc-countdown-time]', (element) => element.textContent),
    /^0[78]:\d\d$/
  );
  await page.click('[data-rc-stop]');

  // On a desk the table is complete on its own: a picked step shows under it, alone.
  await page.setViewport({ width: 1440, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('.rc-step[data-stage="5"] a');
  const pickedStep = await page.$eval('[data-recipe-card]', (card) => ({
    table: card.querySelector('.rc-table-frame').getClientRects().length > 0,
    shown: [...card.querySelectorAll('.rc-steps-item')]
      .filter((step) => step.getClientRects().length > 0)
      .map((step) => step.id),
    number: getComputedStyle(card.querySelector('#rc-step-5'), '::before').content,
    said: card.querySelector('[data-rc-announce]').textContent,
  }));
  assert.deepEqual(pickedStep, {
    table: true,
    shown: ['rc-step-5'],
    number: '"6"',
    said: 'Step 6, Shape into balls, is shown under the table.',
  });
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
