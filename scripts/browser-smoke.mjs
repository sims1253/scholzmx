import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { site } from './address-check.mjs';

const baseURL = process.env.SITE_TEST_URL || 'http://127.0.0.1:4321';
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
});
// How far each mark reaches over its sheet, in rem: an edge mark `onto` the sheet from its
// top edge; a corner mark `up` the sheet from its foot and `left` from its right edge.
// Measured at either end of its turn and at moments sampled through its motion (loops
// with no period in common are never seen in every combination, so it comes close to the
// furthest reach without proving it). Runs in the page.
function reachOf(marks) {
  return marks.map((mark) => {
    const card = mark.closest('.sc-card');
    const face = card.querySelector('.sc-face');
    const svg = mark.querySelector('svg');
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    // A blank sheet laid over the card, to read the drawing in the card's own frame,
    // whatever way the card lies on the desk.
    const sheet = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sheet.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    card.append(sheet);
    try {
      const toCard = sheet.getScreenCTM().inverse();
      const animations = mark.getAnimations({ subtree: true });
      // A loop that runs backwards takes twice its duration to come round.
      const periods = animations.map((animation) => {
        const { duration, direction } = animation.effect.getComputedTiming();
        return direction.startsWith('alternate') ? 2 * duration : duration;
      });
      const horizon = 2 * Math.max(1000, ...periods);
      const step = Math.min(1000, ...periods) / 12;
      // The widest pen stroke; half of it lies outside the drawing's box.
      const strokeOf = (element) => {
        const style = getComputedStyle(element);
        return style.stroke === 'none' ? 0 : Number.parseFloat(style.strokeWidth) || 0;
      };
      const stroke = Math.max(strokeOf(svg), ...[...svg.querySelectorAll('*')].map(strokeOf));
      const edge = mark.classList.contains('sc-mark-edge');
      const worst = { onto: -Infinity, up: -Infinity, left: -Infinity };
      for (const turn of [-40, 40]) {
        mark.style.setProperty('--mark-turn', `${turn}deg`);
        for (let time = 0; time <= horizon; time += step) {
          for (const animation of animations) animation.currentTime = time;
          const box = svg.getBBox();
          const matrix = toCard.multiply(svg.getScreenCTM());
          const points = [
            [box.x, box.y],
            [box.x + box.width, box.y],
            [box.x, box.y + box.height],
            [box.x + box.width, box.y + box.height],
          ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
          const xs = points.map((point) => point.x);
          const ys = points.map((point) => point.y);
          const padY = (stroke * Math.hypot(matrix.b, matrix.d)) / 2;
          const padX = (stroke * Math.hypot(matrix.a, matrix.c)) / 2;
          if (edge) {
            worst.onto = Math.max(worst.onto, (Math.max(...ys) + padY - face.offsetTop) / rem);
          } else {
            worst.up = Math.max(
              worst.up,
              (face.offsetTop + face.offsetHeight - Math.min(...ys) + padY) / rem
            );
            worst.left = Math.max(
              worst.left,
              (face.offsetLeft + face.offsetWidth - Math.min(...xs) + padX) / rem
            );
          }
        }
      }
      const rounded = Object.fromEntries(
        Object.entries(edge ? { onto: worst.onto } : { up: worst.up, left: worst.left }).map(
          ([key, value]) => [key, Math.round(value * 1000) / 1000]
        )
      );
      return { kind: card.dataset.mark, ...rounded };
    } finally {
      sheet.remove();
    }
  });
}

// What moves in each critter (the "What the critters do" section of stacked-card.css):
// whether its body, which is the mark itself, and `part`, a selector inside its drawing
// where one moves. The test holds it, so that a loop deleted from the stylesheet is missed
// here and not.
const MOVES = {
  ants: { body: true, part: '.legs' },
  inchworm: { body: true },
  ladybird: { body: true, part: '.legs' },
  bee: { body: true, part: '.wing' },
  butterfly: { body: true, part: '.wing' },
  dragonfly: { body: true },
  spider: { body: true, part: '.legs' },
  snail: { body: true, part: '.feelers' },
  beetle: { body: true, part: '.legs' },
  cricket: { part: '.feelers' },
  mouse: { part: '.mouse-body, .tail' },
};

// Each critter on a page, and its card. `stiff` counts its animations that never change
// what their target paints: a loop written so that it does nothing. `idle` counts what
// should move (MOVES) that nothing animates: a body without its loop, a part without one,
// and a part the drawing no longer has. `lost` counts animations the card has that its copy
// does not. Runs in the page.
function critterState(marks, moves) {
  const cards = [...document.querySelectorAll('.sc-card')];
  const pose = (element) => {
    const style = getComputedStyle(element);
    return [style.transform, style.translate, style.rotate, style.scale].join(' ');
  };
  return marks.map((mark) => {
    const card = mark.closest('.sc-card');
    const running = mark
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState === 'running').length;
    // Each loop is tried out on a copy of the drawing, off the page. A pause or a play
    // called on the card's own animations would leave them deaf to the stylesheet that
    // stills them.
    const copy = mark.cloneNode(true);
    copy.style.cssText += ';position:fixed;left:-9999px;top:0';
    document.body.append(copy);
    let stiff = 0;
    const copyAnimations = copy.getAnimations({ subtree: true });
    for (const animation of copyAnimations) {
      animation.pause();
      const target = animation.effect.target;
      const { duration } = animation.effect.getComputedTiming();
      const back = animation.effect.getTiming().direction.includes('alternate') ? 2 : 1;
      const poses = new Set();
      for (let step = 0; step <= 12; step += 1) {
        animation.currentTime = (duration * back * step) / 12;
        poses.add(pose(target));
      }
      if (poses.size < 2) stiff += 1;
    }
    const kind = card.dataset.mark;
    const animated = new Set(copyAnimations.map((animation) => animation.effect.target));
    // A critter the table does not know is one nobody said what moves in.
    const expected = moves[kind];
    const parts = expected?.part ? [...copy.querySelectorAll(expected.part)] : [];
    const idle = expected
      ? Number(expected.body === true && !animated.has(copy)) +
        Number(expected.part !== undefined && parts.length === 0) +
        parts.filter((element) => !animated.has(element)).length
      : 1;
    const lost = mark.getAnimations({ subtree: true }).length - copyAnimations.length;
    copy.remove();
    return {
      kind,
      edge: mark.classList.contains('sc-mark-edge'),
      card: cards.indexOf(card),
      still: card.hasAttribute('data-still'),
      running,
      stiff,
      idle,
      lost,
      // The observer's margin is a percentage: above and below the window a share of its
      // height, either side a share of its width (card-critters.ts). A card wholly above
      // the window by a fifth of its height is out of its reach.
      gone: card.getBoundingClientRect().bottom < -0.2 * innerHeight,
    };
  });
}

// The marks on a page keep to their room. The critters move, every part of each one, and
// only while their card is on screen, and a shelf deals them so that cards near each other
// never share one.
async function checkCritters(page, path, width) {
  // The research and project shelves always draw critters; elsewhere they are the luck of
  // the seeds.
  const mustDraw = ['/research/', '/projects/'].includes(path);
  const critters = () => page.$$eval('.sc-mark-edge, .sc-mark-mouse', critterState, MOVES);
  const atTop = await critters();
  // A critter keeps to the strip above the title, the tansy and the mouse to the room the
  // footer line leaves them.
  const reach = await page.$$eval('.sc-mark-edge, .sc-mark-tansy, .sc-mark-mouse', reachOf);
  assert.ok(
    reach.every((mark) =>
      mark.onto !== undefined ? mark.onto <= 0.4 : mark.up <= 2.4 && mark.left <= 3.6
    ),
    `A mark leaves its room on ${path} at ${width}px: ${JSON.stringify(reach)}`
  );
  assert.ok(!mustDraw || atTop.length > 0, `No critter drawn on ${path} at ${width}px`);
  if (!atTop.length) return;

  assert.ok(
    atTop.every(
      (critter) =>
        critter.stiff === 0 &&
        critter.idle === 0 &&
        critter.lost === 0 &&
        (critter.still ? critter.running === 0 : critter.running > 0)
    ) &&
      (atTop.some((critter) => critter.running > 0) || !mustDraw),
    `Critters moving, every part of each, on ${path} at ${width}px: ${JSON.stringify(atTop)}`
  );

  // The shelf deals its critters (cardDressing.ts): cards within three places of each
  // other never share one.
  const edge = atTop.filter((critter) => critter.edge);
  const shared = edge.filter((critter, index) =>
    edge
      .slice(index + 1)
      .some((other) => other.kind === critter.kind && other.card - critter.card <= 3)
  );
  assert.ok(
    shared.length === 0,
    `One critter for cards near each other on ${path} at ${width}px: ${JSON.stringify(shared)}`
  );

  // On a phone the cards stack, so the ones at the top can be scrolled to any distance above
  // the window. What the rest below takes for granted is tried first: the observer's reach,
  // a fifth of the window's height. A card a little beyond it is at rest, and one a little
  // inside it is watched and moving. It is tried from the far side first, so that each step
  // passes only on a change from the state the step before established, and never on what
  // was true before the observer saw the scroll. The first card that moves stands for all.
  if (width !== 390) return;
  const first = atTop.findIndex((critter) => critter.running > 0);
  if (first !== -1) {
    for (const { inside, moving } of [
      { inside: false, moving: false },
      { inside: true, moving: true },
    ]) {
      const reached = await page.evaluate(
        ([index, inside]) => {
          const mark = document.querySelectorAll('.sc-mark-edge, .sc-mark-mouse')[index];
          const to =
            window.scrollY +
            mark.closest('.sc-card').getBoundingClientRect().bottom +
            0.2 * innerHeight +
            (inside ? -12 : 12);
          if (to > document.documentElement.scrollHeight - innerHeight) return false;
          window.scrollTo({ top: to, behavior: 'instant' });
          return true;
        },
        [first, inside]
      );
      // A page too short to bring its card so far above the window cannot show it.
      if (!reached) {
        assert.ok(!mustDraw, `No critter can be brought to the observer's reach on ${path}`);
        break;
      }
      for (let waited = 0; ; waited += 50) {
        const now = (await critters())[first];
        if (moving ? !now.still && now.running > 0 : now.still && !now.running) break;
        assert.ok(
          waited < 2000,
          `A critter ${inside ? 'inside' : 'beyond'} the observer's reach is not ${moving ? 'moving' : 'at rest'} on ${path}: ${JSON.stringify(now)}`
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  // Scrolled out of view for good, one that was moving has come to rest. A page whose
  // critters all stay near the foot of the page cannot show it; the research and project
  // shelves always have one that leaves.
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
  );
  let below;
  for (let waited = 0; ; waited += 50) {
    below = await critters();
    const left = below.filter((critter, i) => atTop[i].running > 0 && critter.gone);
    const canLeave = left.length > 0 || !mustDraw;
    if (canLeave && left.every((critter) => critter.still && !critter.running)) {
      break;
    }
    assert.ok(
      waited < 2000,
      `Critters at rest once scrolled past on ${path}: ${JSON.stringify({ atTop, below })}`
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
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
      await checkCritters(page, path, width);
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
    'Browser smoke checks passed: routes, mobile layout, theme, images, search, RSS, sitemap, card critters.'
  );
} finally {
  await browser.close();
}
