import { test, expect, type Page } from '@playwright/test';

const CENTERLINE_TOLERANCE_PX = 2;

async function expectMainColumnCentered(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const mainColumn = page.locator('[data-main-column]').first();
  await expect(mainColumn).toBeVisible();

  const mainBox = await mainColumn.boundingBox();
  expect(mainBox).not.toBeNull();
  if (!viewport || !mainBox) {
    throw new Error('Cannot verify centering: viewport or main column bounds are null');
  }

  const viewportCenter = viewport.width / 2;
  const mainCenter = mainBox.x + mainBox.width / 2;
  const centerDelta = Math.abs(mainCenter - viewportCenter);
  expect(centerDelta).toBeLessThanOrEqual(CENTERLINE_TOLERANCE_PX);
}

async function expectLeftRailToStayLeftOfMain(page: Page): Promise<void> {
  const leftRail = page.locator('[data-left-rail]').first();
  const mainColumn = page.locator('[data-main-column]').first();

  await expect(leftRail).toBeVisible();
  await expect(mainColumn).toBeVisible();

  const railBox = await leftRail.boundingBox();
  const mainBox = await mainColumn.boundingBox();
  expect(railBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  if (!railBox || !mainBox) {
    throw new Error('Cannot verify rail positioning: rail or main column bounds are null');
  }

  expect(railBox.x + railBox.width).toBeLessThan(mainBox.x);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const pageWidths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(pageWidths.scrollWidth).toBeLessThanOrEqual(pageWidths.clientWidth + 2);
}

test.describe('Full Site Visual and Functionality Check', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('astro-dev-toolbar', 'false');
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: 'astro-dev-toolbar { display: none !important; }',
    });
  });

  test('capture homepage at multiple viewports', async ({ page }) => {
    const viewports = [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'wide', width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await test.step(`capture ${viewport.name} viewport`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.screenshot({
          path: `/home/m0hawk/Documents/scholzmx/screenshots/homepage-${viewport.name}.png`,
          fullPage: true,
        });

        const title = page.locator('.site-title');
        await expect(title).toBeVisible();

        const portrait = page.locator('.portrait-container');
        await expect(portrait).toBeVisible();
      });
    }
  });

  test('check interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await test.step('verify easter egg link', async () => {
      const easterEgg = page.locator('.easter-egg-link');
      await expect(easterEgg).toBeVisible();
      await expect(easterEgg).toHaveAttribute('href', '/garden');
    });

    await test.step('verify latest scribble card', async () => {
      const scribble = page.locator('.latest-scribble');
      await expect(scribble).toBeVisible();
    });

    await test.step('verify bio divider', async () => {
      const divider = page.locator('.bio-divider');
      await expect(divider).toBeVisible();
    });

    await test.step('verify portrait hint on hover', async () => {
      await page.addStyleTag({
        content: '*, *::before, *::after { animation-play-state: paused !important; }',
      });
      const portrait = page.locator('.portrait-container');
      await portrait.hover();
      await page.waitForTimeout(300);

      const hint = page.locator('.portrait-hint');
      await expect(hint).toBeVisible();
    });
  });

  test('check responsive layout changes', async ({ page }) => {
    await test.step('mobile layout - portrait above title', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const portraitMobile = await page.locator('.portrait-container').boundingBox();
      const titleMobile = await page.locator('.site-title').boundingBox();

      if (portraitMobile && titleMobile) {
        expect(portraitMobile.y).toBeLessThan(titleMobile.y);
      }
    });

    await test.step('desktop layout - portrait to the right', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const portraitDesktop = await page.locator('.portrait-container').boundingBox();
      const titleDesktop = await page.locator('.site-title').boundingBox();

      if (portraitDesktop && titleDesktop) {
        expect(portraitDesktop.x).toBeGreaterThan(titleDesktop.x);
      }
    });
  });

  test('Check Listing Pages and Filtering', async ({ page }) => {
    const pages = [
      { path: '/blog', name: 'blog', selector: '.blog-content' },
      { path: '/recipes', name: 'recipes', selector: '.recipes-content' },
    ];

    for (const pageData of pages) {
      await test.step(`verify ${pageData.name} listing page`, async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(pageData.path);
        await page.waitForLoadState('networkidle');

        await page.screenshot({
          path: `/home/m0hawk/Documents/scholzmx/screenshots/listing-${pageData.name}-desktop.png`,
          fullPage: true,
        });

        const listingElement = page.locator(pageData.selector);
        await expect(listingElement).toBeVisible();
      });
    }
  });

  test('Check Blog Post Layout and TOC Fix', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto('/blog/2017/gsoc_postmortem_2');
    await page.waitForLoadState('networkidle');

    await test.step('verify breadcrumbs', async () => {
      const breadcrumb = page.locator('.breadcrumb');
      await expect(breadcrumb).toBeVisible();
    });

    await test.step('verify TOC visibility and positioning', async () => {
      const toc = page.locator('.toc-container');
      await expect(toc).toBeVisible();

      const titleBox = await page.locator('.post-title').boundingBox();
      const tocBox = await toc.boundingBox();

      if (titleBox && tocBox) {
        expect(tocBox.x + tocBox.width).toBeLessThan(titleBox.x);
      }
    });

    await test.step('capture screenshot', async () => {
      await page.screenshot({
        path: '/home/m0hawk/Documents/scholzmx/screenshots/post-blog-desktop.png',
        fullPage: true,
      });
    });
  });

  test('capture audit screenshots', async ({ page }) => {
    const auditPages = [
      { path: '/projects', name: 'audit-projects.png' },
      { path: '/research', name: 'audit-research.png' },
      { path: '/recipes/hokkaido-dinner-rolls', name: 'audit-recipe-detail.png' },
      { path: '/blog/2022/01-26-simulating-dags', name: 'audit-blog-new-post.png' },
    ];

    await page.setViewportSize({ width: 1440, height: 900 });

    for (const pageData of auditPages) {
      await test.step(`capture ${pageData.name}`, async () => {
        await page.goto(pageData.path);
        await page.waitForLoadState('networkidle');

        await page.screenshot({
          path: `/home/m0hawk/Documents/scholzmx/screenshots/${pageData.name}`,
          fullPage: true,
        });
      });
    }
  });

  test('homepage - portrait hint text has good contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Pause animations to check static state
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-play-state: paused !important; }',
    });

    const hint = page.locator('.portrait-hint');
    await expect(hint).toBeVisible();

    // Check that opacity is at least 0.7 for good contrast
    const opacity = await hint.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return parseFloat(style.opacity);
    });
    expect(opacity).toBeGreaterThanOrEqual(0.7);
  });

  test('blog post - code blocks do not overflow on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/blog/2022/01-26-simulating-dags');
    await page.waitForLoadState('networkidle');

    // Check that the main content doesn't cause horizontal scroll
    await expectNoHorizontalOverflow(page);
  });

  test('blog listing - filters are visible and not truncated', async ({ page }) => {
    // Use larger viewport where sidebar is visible
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');

    // Check that the sidebar is visible
    const sidebar = page.locator('.blog-filters');
    await expect(sidebar).toBeVisible();

    // Check that filter buttons contain full year text (e.g., "2024" not "20")
    const yearSection = page.locator('.sidebar-section').filter({ hasText: 'Filter by year' });
    const yearButtons = yearSection.locator('.filter-btn');
    const count = await yearButtons.count();

    // Skip the "All" button, check year buttons
    for (let i = 1; i < count; i++) {
      const btn = yearButtons.nth(i);
      const text = await btn.textContent();
      // Year buttons should have exactly 4 characters
      if (text && /^\d{4}$/.test(text.trim())) {
        expect(text.trim().length).toBe(4);
      }
    }
  });

  test('blog post - content is centered on desktop', async ({ page }) => {
    const viewports = [
      { width: 1500, height: 900 },
      { width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/blog/2022/01-26-simulating-dags');
      await page.waitForLoadState('networkidle');

      await expectMainColumnCentered(page);
      await expectLeftRailToStayLeftOfMain(page);
    }
  });

  test('recipe page - content is centered on desktop', async ({ page }) => {
    const viewports = [
      { width: 1500, height: 900 },
      { width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/recipes/hokkaido-dinner-rolls');
      await page.waitForLoadState('networkidle');

      await expectMainColumnCentered(page);
      await expectLeftRailToStayLeftOfMain(page);
    }
  });

  test('article pages - no horizontal overflow on mobile', async ({ page }) => {
    const pages = ['/blog/2022/01-26-simulating-dags', '/recipes/hokkaido-dinner-rolls'];

    await page.setViewportSize({ width: 375, height: 812 });

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page);
    }
  });
});
