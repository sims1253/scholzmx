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
        // The header, the wall and what follows it share two edges, and the bio keeps
        // a reading measure.
        const edges = await page.evaluate(() => {
          const box = (selector) => document.querySelector(selector).getBoundingClientRect();
          const bio = document.querySelector('.bio p');
          return {
            wordmark: box('.site-logo').left,
            wall: box('.first-screen').left,
            about: box('.about').left,
            measure: box('.bio').width / parseFloat(getComputedStyle(bio).fontSize),
          };
        });
        assert.ok(Math.abs(edges.wordmark - edges.wall) < 2, `Wall edge at ${width}px`);
        assert.ok(Math.abs(edges.wordmark - edges.about) < 2, `About edge at ${width}px`);
        assert.ok(edges.measure <= 27, `Bio measure at ${width}px: ${edges.measure}em`);
        // What a niche keeps is named in whole words; a shortened title is read out whole,
        // and a link that leaves the site says so.
        const kept = await page.$$eval('.kept a', (links) =>
          links.map((link) => ({
            text: link.textContent.trim(),
            name: link.getAttribute('aria-label'),
            clipped: link.scrollHeight > link.clientHeight + 1,
            leaves: link.origin !== location.origin,
          }))
        );
        assert.equal(kept.length, 4);
        for (const link of kept) {
          assert.equal(link.clipped, false, `Kept title clipped: ${link.text}`);
          if (link.leaves) assert.match(link.name, /leaves this site/);
          if (link.text.endsWith('…')) {
            assert.match(link.text, /[a-z]…$/);
            assert.ok(link.name.startsWith(link.text.slice(0, -1)), link.name);
            assert.ok(link.name.length > link.text.length + 20, link.name);
          }
        }
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
          // The frame is 200px wide on a phone and wider on a desk; its framing scales.
          return results.map((result) => ({ ...result, scale: bounds.width / 200 }));
        });
        assert.equal(portraits.length, 2);
        assert.ok(
          portraits.every((portrait) => portrait.coversFrame),
          `Portrait gap at ${width}px`
        );
        // Painted bounds measured on the live homepage at 200px; allow one pixel there for
        // image resize rounding. A wider frame shows the same framing, larger.
        const liveFraming = [
          [-12.35, -28.808, 224.7, 299.6],
          [-30, -5.75, 230, 345],
        ];
        for (const [index, portrait] of portraits.entries()) {
          for (const [dimension, value] of portrait.paintedBounds.entries()) {
            assert.ok(
              Math.abs(value / portrait.scale - liveFraming[index][dimension]) < 1,
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
  // A reload in the middle of the bake keeps the step and its timer, and the card as it
  // was: the amount, and what was ticked off.
  await page.click('input[name="rc-scale"][value="2"]');
  await page.$eval('.rc-gather-list input', (tick) => tick.click());
  await page.reload({ waitUntil: 'networkidle0' });
  assert.match(
    await page.$eval('[data-rc-countdown-time]', (element) => element.textContent),
    /^0[78]:\d\d$/
  );
  assert.equal(await page.$eval('[data-yield]', (element) => element.textContent), '30');
  assert.ok(await page.$eval('.rc-gather-list input', (tick) => tick.checked));
  // When the first stage ends on another step, what it asks for goes there with the
  // timer, and stays until the cook has done it.
  await page.click('[data-rc-back]');
  await page.evaluate(() => {
    const now = Date.now;
    Date.now = () => now() + 9 * 60_000;
  });
  await page.waitForSelector('[data-rc-cue]:not([hidden])');
  assert.match(
    await page.$eval('[data-rc-cue-text]', (element) => element.textContent),
    /^Bake, now: turn the oven down to 200 °C/
  );
  assert.match(
    await page.$eval('[data-rc-alarm]', (element) => element.textContent),
    /^Bake: Turn the oven down/
  );
  await page.click('[data-rc-cue-done]');
  assert.equal(await page.$('[data-rc-cue]:not([hidden])'), null);
  // Stopping would drop the running timer, so it asks first; Escape leaves it alone.
  // Back and Stop are large enough for a finger.
  await page.keyboard.press('Escape');
  assert.ok(await page.$eval('[data-rc-cook]', (bar) => !bar.hidden), 'Escape kept the timer');
  for (const control of ['[data-rc-back]', '[data-rc-stop]']) {
    const box = await page.$eval(control, (element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height };
    });
    assert.ok(box.width >= 44 && box.height >= 44, `${control} is ${box.width}×${box.height}`);
  }
  await page.click('[data-rc-stop]');
  assert.match(
    await page.$eval('[data-rc-stop]', (element) => element.textContent),
    /Drop the timer and stop\?/
  );
  assert.ok(await page.$eval('[data-rc-cook]', (bar) => !bar.hidden), 'One press does not stop');
  await page.click('[data-rc-stop]');
  assert.ok(await page.$eval('[data-rc-cook]', (bar) => bar.hidden));

  // On a desk the table is complete on its own. It opens with the first step under it,
  // so the method is on the page before anything is picked, and its steps' names look
  // like the links they are. A picked step shows under it, alone.
  await page.setViewport({ width: 1440, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepEqual(
    await page.$$eval('.rc-steps-item', (steps) =>
      steps.filter((step) => step.getClientRects().length > 0).map((step) => step.id)
    ),
    ['rc-step-0']
  );
  assert.equal(
    await page.$eval('.rc-do', (name) => getComputedStyle(name).textDecorationLine),
    'underline'
  );
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
  // Focus goes to the step that was picked, on screen, and there is a way back from it
  // to the table. Reading all the steps lands on the first one, on screen too.
  const focused = () =>
    page.evaluate(() => {
      const { top, bottom } = document.activeElement.getBoundingClientRect();
      return {
        text: document.activeElement.textContent.trim(),
        onScreen: top >= 0 && bottom <= innerHeight,
      };
    });
  await page.waitForFunction(() => {
    const { top, bottom } = document.activeElement.getBoundingClientRect();
    return top >= 0 && bottom <= innerHeight;
  });
  assert.deepEqual(await focused(), { text: 'Shape into balls', onScreen: true });
  await page.click('[data-rc-to-table]');
  assert.equal(
    await page.evaluate(() => document.activeElement.closest('.rc-step')?.dataset.stage),
    '5'
  );
  await page.click('[data-rc-all]');
  await page.waitForFunction(
    () => Math.abs(document.activeElement.getBoundingClientRect().top) < 200
  );
  assert.deepEqual(await focused(), { text: 'Get ready', onScreen: true });

  // Where the table scrolls sideways, cooking brings a step's column into view between
  // the pinned ingredients and the right edge, and leaves a column that fits alone.
  await page.setViewport({ width: 820, height: 1180 });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('input[name="rc-view"][value="table"]');
  await page.click('[data-rc-start]');
  const column = () =>
    page.$eval('[data-recipe-card]', (card) => {
      const wrap = card.querySelector('.rc-table-wrap');
      const cell = card.querySelector('.rc-step.is-current').getBoundingClientRect();
      return {
        scrolled: Math.round(wrap.scrollLeft),
        clear:
          cell.left >= card.querySelector('.rc-ingredient').getBoundingClientRect().right - 1 &&
          cell.right <= wrap.getBoundingClientRect().right + 1,
      };
    });
  for (let step = 0; step < 3; step++) await page.click('[data-rc-next]');
  assert.deepEqual(await column(), { scrolled: 0, clear: true }, 'Knead fits and stays');
  for (let step = 0; step < 4; step++) await page.click('[data-rc-next]');
  const bake = await column();
  assert.ok(bake.clear && bake.scrolled > 0, 'Bake comes into view');
  await page.click('[data-rc-back]');
  assert.deepEqual(await column(), bake, 'Rise again was in view and stays');
  await page.click('[data-rc-stop]');
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
