import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
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

// Extract the pathname of a local `/grotto/...` grain tile from a CSS `url(...)`.
function tilePathOf(image) {
  const match = /url\((["']?)([^)"']+)\1\)/.exec(image ?? '');
  if (!match) return null;
  const raw = match[2];
  if (raw.startsWith('data:')) return null;
  try {
    return new URL(raw, 'http://local.test').pathname;
  } catch {
    return null;
  }
}

// Decode a served pre-rasterized grain tile losslessly so we can verify the faint
// torchlit tile is the exact same tint at half the alpha strength without 8-bit
// premultiplied canvas quantization noise.
async function tileStatsOf(tilePath) {
  const response = await fetch(`${baseURL}${tilePath}`);
  assert.equal(response.status, 200, `Missing grain tile: ${tilePath}`);
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let alphaSum = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let visible = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    alphaSum += a;
    if (a > 0) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      visible++;
    }
  }
  const pixels = info.width * info.height;
  return {
    width: info.width,
    height: info.height,
    meanAlpha: alphaSum / pixels,
    rgb: visible ? [rSum / visible, gSum / visible, bSum / visible] : [0, 0, 0],
  };
}

// Whether one pre-rasterized tile is another at half the alpha strength with the same tint.
function halfStrength(one, other) {
  if (!one || !other || one.width !== other.width || one.height !== other.height) return false;
  if (other.meanAlpha <= 0) return false;
  const ratio = one.meanAlpha / other.meanAlpha;
  const sameTint = one.rgb.every((channel, at) => Math.abs(channel - other.rgb[at]) <= 1);
  return sameTint && Math.abs(ratio - 0.5) < 0.01;
}

// How ruled, binder, squared and dotted sheets place their words above their lines or
// dots: every word's baseline sits a couple of pixels above its rule or dot row, never
// cut by it and never drifting off pitch. Runs in the page.
function ruledAlignmentOf(cards) {
  const style = document.createElement('style');
  style.textContent =
    '* { transition: none !important; animation: none !important } .line-mark { display: inline-block; width: 0; height: 0 }';
  document.head.append(style);
  const results = cards.map((card) => {
    card.style.setProperty('--sc-turn', '0deg');
    card.style.setProperty('--sc-lift', '0px');
    const content = card.querySelector('.sc-content');
    const face = card.querySelector('.sc-face');
    const pitch = Number.parseFloat(
      getComputedStyle(content.querySelector('.sc-title') || content).lineHeight
    );
    const faceStyle = getComputedStyle(face);
    const images = faceStyle.backgroundImage.split(
      /,\s*(?=(?:url\("|(?:repeating-)?(?:linear|radial|conic)-gradient\(|none\b))/
    );
    const positions = faceStyle.backgroundPosition.split(',');
    const ruleLayer = images.findIndex((image, at) => {
      const yStr = positions[at]?.trim().split(/\s+/)[1] ?? '';
      const y = Number.parseFloat(yStr);
      return (
        yStr.endsWith('px') &&
        (image.includes('linear-gradient') || image.includes('radial-gradient')) &&
        y > 10 &&
        y < 70
      );
    });
    if (ruleLayer === -1) {
      throw new Error(`${card.dataset.ruling}: rule layer not found`);
    }
    const ruleTop = Number.parseFloat(positions[ruleLayer].trim().split(/\s+/)[1]);
    const period =
      card.dataset.ruling === 'squared' || card.dataset.ruling === 'dotted' ? pitch / 2 : pitch;
    const texts = [];
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node);
    for (const node of texts) {
      if (!/\S/.test(node.data)) continue;
      const frag = document.createDocumentFragment();
      node.data.split(/(\s+)/).forEach((part, index) => {
        if (index % 2) frag.append(part);
        else if (part) {
          frag.append(part);
          const mark = document.createElement('i');
          mark.className = 'line-mark';
          frag.append(mark);
        }
      });
      node.replaceWith(frag);
    }
    const faceTop = face.getBoundingClientRect().top + 1;
    const baselines = [...content.querySelectorAll('.line-mark')].map(
      (mark) => mark.getBoundingClientRect().bottom - faceTop
    );
    const gaps = baselines.map((baseline) => {
      const rel = (((ruleTop - baseline) % period) + period) % period;
      return rel > period / 2 ? rel - period : rel;
    });
    const minGap = Math.min(...gaps);
    const maxGap = Math.max(...gaps);
    return {
      ruling: card.dataset.ruling,
      title: content.querySelector('.sc-title')?.textContent?.trim().slice(0, 28),
      minGap: Math.round(minGap * 100) / 100,
      maxGap: Math.round(maxGap * 100) / 100,
      spread: Math.round((maxGap - minGap) * 100) / 100,
      overflow: Math.round((content.offsetHeight - face.clientHeight) * 100) / 100,
    };
  });
  style.remove();
  return results;
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
      // A sheet is the desk's own rag paper, in either theme: it carries the desk's
      // pre-rasterized tooth tile, one layer of it and no other, at its own size, whatever
      // else is printed on the sheet; an aged one its mottle too; and so does the sheet
      // under it. None of it runs runtime SVG feTurbulence or fetches external assets.
      const TOOTH = '/grotto/paper-tooth-';
      const MOTTLE = '/grotto/paper-mottle-';
      const toothOf = (sheet) => {
        const teeth = sheet.images.flatMap((image, at) => {
          const tile = tilePathOf(image);
          return tile?.startsWith(TOOTH) ? [[tile, sheet.sizes[at]]] : [];
        });
        return teeth.length === 1 ? teeth[0] : null;
      };
      const unexpectedUrls = (card) =>
        [...card.top.images, ...(card.under?.images ?? [])].filter((image) => {
          if (image.includes('feTurbulence')) return true;
          const tile = tilePathOf(image);
          return tile !== null && !tile.startsWith('/grotto/');
        });
      const mottleOf = (card) => {
        const at = card.top.images.findIndex((image) => tilePathOf(image)?.startsWith(MOTTLE));
        return at === -1 ? null : card.top.sizes[at];
      };
      const papered = (card, tooth) => {
        const teeth = (card.under ? [card.top, card.under] : [card.top]).map(toothOf);
        return (
          teeth.every((own) => own && own[0] === tooth && own[1] === '128px 128px') &&
          unexpectedUrls(card).length === 0 &&
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
        unexpected: unexpectedUrls(card),
      });
      let checkedDarkHalfStrength = false;
      const was = await page.$eval('html', (element) => element.getAttribute('data-theme'));
      for (const theme of ['light', 'dark']) {
        await page.$eval(
          'html',
          (element, theme) => element.setAttribute('data-theme', theme),
          theme
        );
        const desk = await page.$eval('body', deskOf);
        const paper = await page.$$eval('.sc-card', paperOf);
        const whole = tilePathOf(desk.tooth);
        const faint = tilePathOf(desk.faint);
        assert.ok(
          whole?.startsWith(TOOTH) && faint?.startsWith(TOOTH),
          `A pre-rasterized tile of the desk's tooth is missing on ${path} at ${width}px, ${theme} by choice: ${JSON.stringify({ whole, faint })}`
        );
        // The faint tile is the desk's torchlit one at half the strength.
        if (theme === 'dark' && !checkedDarkHalfStrength) {
          const [wholeStats, faintStats] = await Promise.all([
            tileStatsOf(whole),
            tileStatsOf(faint),
          ]);
          assert.ok(
            halfStrength(faintStats, wholeStats),
            `The desk's faint tile is not its torchlit one at half the strength on ${path} at ${width}px: ${JSON.stringify({ wholeStats, faintStats })}`
          );
          checkedDarkHalfStrength = true;
        }
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
      assert.equal(
        await page.$$eval('.sc-mark-ants', (elements) => elements.length),
        0,
        `Ants mark should not render on ${path} at ${width}px`
      );
      // Every ruled, binder, squared and dotted sheet (outside top-strip hero cards whose
      // 8/3 image height scales continuously with width) keeps its baselines a couple of
      // pixels above its lines or dots with tight consistency and no clipping.
      const lined = await page.$$eval(
        '.sc-card:is([data-ruling="ruled"], [data-ruling="binder"], [data-ruling="squared"], [data-ruling="dotted"]):not(:has(.sc-media:not(.nc-thumb)))',
        ruledAlignmentOf
      );
      assert.ok(
        lined.every(
          (sheet) =>
            sheet.minGap >= 2.0 && sheet.maxGap <= 4.3 && sheet.spread <= 1.2 && sheet.overflow <= 0
        ),
        `Writing misaligned on ${path} at ${width}px: ${JSON.stringify(lined)}`
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
    const requested = [];
    const track = (request) => requested.push(request.url());
    page.on('request', track);
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle0' });
    page.off('request', track);
    assert.equal(
      requested.filter((url) => /pagefind/i.test(url)).length,
      0,
      `Pagefind should stay unloaded until search is interacted with on ${path}: ${requested.filter((url) => /pagefind/i.test(url)).join(', ')}`
    );
    assert.equal(
      await page.$eval('[data-search-options]', (el) => el.dataset.searchReady ?? ''),
      '',
      `Pagefind UI should not mount before interaction on ${path}`
    );

    // Open folded search disclosures as a visitor would, or focus the open placeholder.
    const isOpen = await page.$eval('details.finder-search', (el) => el.open);
    if (!isOpen) {
      await page.click('details.finder-search > summary');
    } else {
      await page.focus('.pagefind-ui__search-input');
    }
    await page.waitForSelector('[data-search-options][data-search-ready="true"]');
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

  // A recipe opens on the table where the table fits, and on the steps elsewhere, without
  // duplicating both views at once. Selecting a table cell reveals its step details, and
  // switching to Steps shows the full list.
  for (const [width, view] of [
    [1440, 'table'],
    [390, 'steps'],
  ]) {
    await page.setViewport({ width, height: 844 });
    await page.goto(`${baseURL}/recipes/hokkaido-dinner-rolls/`, { waitUntil: 'networkidle0' });
    const opened = await page.$eval('[data-recipe-card]', (card) => ({
      view: card.dataset.view,
      checked: card.querySelector('input[name="rc-view"]:checked')?.value,
      table: card.querySelector('.rc-table-frame').getClientRects().length > 0,
      steps: card.querySelector('.rc-steps-view').getClientRects().length > 0,
      hidden:
        card.querySelector('.rc-table-wrap').scrollWidth -
        card.querySelector('.rc-table-wrap').clientWidth,
    }));
    assert.equal(opened.view, view, `Recipe view at ${width}px`);
    assert.equal(opened.checked, view, `Recipe view control at ${width}px`);
    if (view === 'table') {
      assert.ok(opened.table, `Table must show at ${width}px`);
      assert.ok(!opened.steps, `Steps must stay hidden in table view at ${width}px`);
      assert.ok(opened.hidden <= 1, 'The opening table must not scroll');
      await page.click('.rc-step[data-stage="1"] .rc-cell-btn');
      const peek = await page.$eval('[data-rc-peek]', (panel) => ({
        visible: !panel.hidden,
        detail: panel.querySelector('[data-rc-peek-detail]')?.textContent?.trim(),
      }));
      assert.ok(peek.visible && peek.detail, 'Selecting a table cell should reveal step details');
      await page.click('label:has(input[name="rc-view"][value="steps"])');
      const switched = await page.$eval('[data-recipe-card]', (card) => ({
        view: card.dataset.view,
        table: card.querySelector('.rc-table-frame').getClientRects().length > 0,
        steps: card.querySelector('.rc-steps-view').getClientRects().length > 0,
      }));
      assert.equal(switched.view, 'steps');
      assert.ok(
        !switched.table && switched.steps,
        'Switching to Steps must trade places with Table'
      );
    } else {
      assert.ok(!opened.table, `Table must stay hidden at ${width}px`);
      assert.ok(opened.steps, `The step list must show at ${width}px`);
    }
  }
  await page.setViewport({ width: 1440, height: 844 });
  await page.goto(`${baseURL}/recipes/pour-over-coffee/`, { waitUntil: 'networkidle0' });
  const coffee = await page.$eval('[data-recipe-card]', (card) => ({
    view: card.dataset.view,
    tableWidth: card.querySelector('.rc-table').getBoundingClientRect().width,
    wrapWidth: card.querySelector('.rc-table-wrap').getBoundingClientRect().width,
  }));
  assert.equal(coffee.view, 'table');
  assert.ok(
    coffee.wrapWidth - coffee.tableWidth <= 2,
    `Short recipe table should fill its card (${coffee.tableWidth} vs ${coffee.wrapWidth})`
  );
  // Force lazy images to load before checking their decoded dimensions.
  await page.goto(`${baseURL}/recipes/hokkaido-dinner-rolls/`, { waitUntil: 'networkidle0' });
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
