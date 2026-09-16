import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/** The committed snapshot, read in Node rather than fetched, so the test needs no server route. */
const SNAPSHOT = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../data/jargons.json', import.meta.url)), 'utf8'),
) as { terms: { id: string; title: string }[] };

/**
 * CodeMirror renders into a contenteditable, which `fill` does not touch.
 * Everything here types through the keyboard instead.
 */
async function typeCode(page: Page, code: string) {
  await page.waitForSelector('.cm-content', { timeout: 15000 });
  await page.click('.cm-content');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(code);
}

/**
 * Progress lives in localStorage, so each test starts from a clean slate.
 *
 * The sentinel matters: an init script runs on every navigation, so clearing
 * unconditionally would also wipe progress on a reload, which is the thing two of these
 * tests are here to check.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('test-cleared')) return;
      localStorage.clear();
      sessionStorage.setItem('test-cleared', '1');
    } catch {
      /* private mode */
    }
  });
});

test.describe('deep links', () => {
  test('a term hash opens the drawer on Learn', async ({ page }) => {
    await page.goto('/#/term/functor');
    await expect(page.getByRole('heading', { name: 'Functor', level: 2 })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Learn' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('#functor')).toBeVisible();
  });

  test('a practice hash opens a specific rung', async ({ page }) => {
    await page.goto('/#/term/currying/practice/apply');
    await expect(page.getByRole('heading', { name: 'Go point-free', level: 3 })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Practice/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('an upstream-style bare hash still resolves', async ({ page }) => {
    await page.goto('/#currying');
    await expect(page.getByRole('heading', { name: 'Currying', level: 2 })).toBeVisible();
  });

  test('an unknown term id leaves the graph alone rather than erroring', async ({ page }) => {
    await page.goto('/#/term/not-a-real-term');
    await expect(page.locator('.drawer')).toHaveCount(0);
    await expect(page.locator('canvas.graph-canvas')).toBeVisible();
  });
});

test.describe('solving a rung', () => {
  test('a correct implementation turns every check green and marks the rung done', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await typeCode(page, 'const curry2 = (f) => (a) => (b) => f(a, b)');

    await expect(page.locator('.tally')).toHaveText('6 / 6 passing', { timeout: 10000 });
    await expect(page.locator('.check.fail')).toHaveCount(0);
    await expect(page.locator('.cleared')).toBeVisible();

    // The stepper and the tab count both reflect it.
    await expect(page.locator('.step.done')).toHaveCount(1);
    await expect(page.getByRole('tab', { name: /Practice/ })).toContainText('1/3');
  });

  test('a wrong implementation explains itself with the actual value', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await typeCode(page, 'const curry2 = (f) => (a, b) => f(a, b)');

    const failure = page.locator('.check.fail').first();
    await expect(failure).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.check-detail')).toContainText('Got');
    await expect(page.locator('.cleared')).toHaveCount(0);
  });

  test('a point-free rung rejects code that still names its argument', async ({ page }) => {
    await page.goto('/#/term/currying/practice/apply');
    await typeCode(
      page,
      'const map = (fn) => (list) => list.map(fn)\nconst add = (a) => (b) => a + b\nconst incrementAll = (ns) => map(add(1))(ns)',
    );
    await expect(page.locator('.check-detail')).toContainText('still names its argument', { timeout: 10000 });
  });

  test('a syntax error is reported without losing the code', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    // Not an unclosed bracket: the editor auto-closes those, which would make this valid.
    await typeCode(page, 'const curry2 = 1 +');
    await expect(page.locator('.fatal')).toContainText('SyntaxError', { timeout: 10000 });
    await expect(page.locator('.cm-content')).toContainText('const curry2');
  });

  test('a missing export asks for it by name', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await typeCode(page, 'const somethingElse = 1');
    await expect(page.locator('.fatal')).toContainText('Define `curry2`', { timeout: 10000 });
  });

  test('progress survives a reload', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await typeCode(page, 'const curry2 = (f) => (a) => (b) => f(a, b)');
    await expect(page.locator('.cleared')).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByRole('tab', { name: /Practice/ })).toContainText('1/3', { timeout: 10000 });
  });
});

test.describe('the timeout path', () => {
  test('an infinite loop is killed and named, and the next run still works', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await typeCode(page, 'const curry2 = (f) => { while (true) {} }');

    await expect(page.locator('.fatal')).toContainText('did not finish', { timeout: 15000 });
    await expect(page.locator('.fatal')).toContainText('loop or a recursion with no way out');

    // The runner must have spawned a fresh worker, or every later run would hang too.
    await typeCode(page, 'const curry2 = (f) => (a) => (b) => f(a, b)');
    await expect(page.locator('.tally')).toHaveText('6 / 6 passing', { timeout: 10000 });
  });
});

test.describe('choice rungs', () => {
  test('grading a multi-select shows why each option is right or wrong', async ({ page }) => {
    await page.goto('/#/term/currying/practice/recognize');
    const options = page.locator('.option');
    await options.nth(1).click();
    await options.nth(2).click();
    await page.getByRole('button', { name: 'Check answer' }).click();

    await expect(page.locator('.tally')).toHaveText('Correct');
    await expect(page.locator('.why')).toHaveCount(5);
    await expect(page.locator('.cleared')).toBeVisible();
  });

  test('a wrong pick can be retried', async ({ page }) => {
    await page.goto('/#/term/currying/practice/recognize');
    await page.locator('.option').first().click();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.locator('.tally')).toContainText('Not quite');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible();
  });
});

test.describe('the shell', () => {
  test('every term renders in Learn with highlighted code and working internal links', async ({ page }) => {
    await page.goto('/#/term/functor');
    await expect(page.locator('.defbox')).not.toBeEmpty();
    await expect(page.locator('.code-block').first()).toBeVisible();
    // Highlighting comes from the lezer parser, not a stylesheet class we hardcode.
    await expect(page.locator('.code-block .tok-fn').first()).toBeVisible();

    // An internal #term link switches concepts in-app rather than jumping the page.
    await page.locator('.prose a.term-link').first().click();
    await expect(page).toHaveURL(/#\/term\//);
  });

  test('search finds a concept by name and opens it', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Search').click();
    await page.locator('.search-hud input').fill('monoid');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Monoid', level: 2 })).toBeVisible();
  });

  test('the slash shortcut opens search', async ({ page }) => {
    await page.goto('/');
    await page.locator('canvas.graph-canvas').focus();
    await page.keyboard.press('/');
    await expect(page.locator('.search-hud')).toBeVisible();
  });

  test('Escape closes the drawer', async ({ page }) => {
    await page.goto('/#/term/functor');
    await expect(page.locator('.drawer')).toBeVisible();
    await page.locator('.drawer-head h2').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.drawer')).toHaveCount(0);
  });

  test('Escape inside the editor does not close the drawer', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await page.waitForSelector('.cm-content');
    await page.click('.cm-content');
    await page.keyboard.press('Escape');
    await expect(page.locator('.drawer')).toBeVisible();
  });

  test('the theme toggle switches and sticks', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const before = await html.getAttribute('class');
    await page.getByTitle('Switch theme').click();
    await expect(html).not.toHaveClass(before ?? '');
    const after = await html.getAttribute('class');
    await page.reload();
    await expect(html).toHaveClass(after ?? '');
  });

  test('the list view is a usable fallback for the graph', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Switch to the list').click();
    await expect(page.locator('.term-list section')).toHaveCount(6);
    await expect(page.locator('.list-item')).toHaveCount(75);
    await page.getByRole('button', { name: /^Currying/ }).click();
    await expect(page.getByRole('heading', { name: 'Currying', level: 2 })).toBeVisible();
  });

  test('the graph renders all 75 terms and reset restores the view', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas.graph-canvas');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1500);

    // Zoom in, then Reset should put it back.
    await canvas.hover();
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: '[ Reset ]' }).click();
    await page.waitForTimeout(800);
    await expect(canvas).toBeVisible();
  });

  test('graph nodes are reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.locator('canvas.graph-canvas').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.locator('.drawer')).toBeVisible();
  });

  test('progress exports and resets', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await typeCode(page, 'const curry2 = (f) => (a) => (b) => f(a, b)');
    await expect(page.locator('.cleared')).toBeVisible({ timeout: 10000 });

    await page.getByTitle('Progress').click();
    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export progress' }).click();
    expect((await download).suggestedFilename()).toMatch(/^fp-exercises-progress-\d{4}-\d{2}-\d{2}\.json$/);

    await page.getByRole('menuitem', { name: 'Reset progress' }).click();
    await page.getByRole('menuitem', { name: 'Really reset everything?' }).click();
    await expect(page.getByRole('tab', { name: /Practice/ })).toContainText('0/3');
  });
});

test.describe('narrow viewport', () => {
  test.use({ viewport: { width: 420, height: 780 } });

  test('practice is usable as a sheet on a phone', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await expect(page.locator('.drawer')).toBeVisible();
    await typeCode(page, 'const curry2 = (f) => (a) => (b) => f(a, b)');
    await expect(page.locator('.tally')).toHaveText('6 / 6 passing', { timeout: 10000 });

    // Nothing should overflow the viewport horizontally.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe('every term', () => {
  // The exit criterion is that all 75 render, not just the three with exercises.
  test('renders in Learn without a console error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    expect(SNAPSHOT.terms).toHaveLength(75);

    for (const term of SNAPSHOT.terms) {
      await page.goto(`/#/term/${term.id}`);
      await expect(page.locator('.drawer-head h2')).toHaveText(term.title);
      await expect(page.locator('.defbox')).not.toBeEmpty();
    }
    expect(errors).toEqual([]);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('clearing a concept does not draw the celebration', async ({ page }) => {
    await page.goto('/#/term/pure-function/practice/recognize');
    await page.locator('.option').nth(2).click();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.locator('.cleared')).toBeVisible();

    await page.goto('/#/term/pure-function/practice/implement');
    await typeCode(
      page,
      'const addItem = (cart, item, now) => ({ ...cart, items: [...cart.items, item], updatedAt: now })',
    );
    await expect(page.locator('.cleared.concept-done')).toBeVisible({ timeout: 10000 });
    // The banner still appears; only the canvas animation is suppressed.
    await expect(page.locator('canvas.celebrate')).toHaveCount(0);
  });
});

test.describe('progress import', () => {
  test('an exported file restores the rungs it recorded', async ({ page }) => {
    await page.goto('/#/term/currying/practice/implement');
    await typeCode(page, 'const curry2 = (f) => (a) => (b) => f(a, b)');
    await expect(page.locator('.cleared')).toBeVisible({ timeout: 10000 });

    const saved = await page.evaluate(() => localStorage.getItem('fpx-progress-v1'));

    await page.getByTitle('Progress').click();
    await page.getByRole('menuitem', { name: 'Reset progress' }).click();
    await page.getByRole('menuitem', { name: 'Really reset everything?' }).click();
    await expect(page.getByRole('tab', { name: /Practice/ })).toContainText('0/3');

    await page.getByTitle('Progress').click();
    await page.setInputFiles('input[type=file]', {
      name: 'progress.json',
      mimeType: 'application/json',
      buffer: Buffer.from(saved!),
    });
    await expect(page.getByRole('tab', { name: /Practice/ })).toContainText('1/3');
  });

  test('a file that is not a progress export is rejected with a reason', async ({ page }) => {
    await page.goto('/#/term/currying');
    await page.getByTitle('Progress').click();
    await page.setInputFiles('input[type=file]', {
      name: 'nope.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"version":99}'),
    });
    await expect(page.locator('.menu-msg')).toContainText('not a version 1 progress export');
  });
});

test.describe('the curriculum path', () => {
  test('the list view runs the categories in learning order', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Switch to the list').click();
    // Each heading is "<glyph><name><count>", so strip both ends.
    const headings = await page.locator('.term-list h2').allTextContents();
    const names = headings.map((h) => h.replace(/^\D\s*/, '').replace(/\s*\d+\s*$/, '').trim());
    expect(names).toEqual([
      'Core Functions',
      'Composition & Flow',
      'Purity & Reasoning',
      'Types & Data Modeling',
      'Algebraic Structures',
      'Category & Morphisms',
    ]);
  });

  test('clearing a concept offers the next one in the curriculum', async ({ page }) => {
    // `function` is first. Clearing all of it should point at `arity`, the second.
    await page.goto('/#/term/function/practice/recognize');
    await page.locator('.option').nth(2).click();
    await page.getByRole('button', { name: 'Check answer' }).click();

    // The diagnose rung: the three that fail "same input, same output".
    await page.goto('/#/term/function/practice/diagnose');
    for (const i of [0, 2, 4]) await page.locator('.option').nth(i).click();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.locator('.tally')).toHaveText('Correct');

    await page.goto('/#/term/function/practice/implement');
    await typeCode(
      page,
      "const toLabel = (n) => {\n  if (n < 0) return 'below'\n  if (n === 0) return 'zero'\n  return 'above'",
    );
    await expect(page.locator('.cleared.concept-done')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /^Next: / })).toContainText('Next: Arity');
  });

  test('the suggestion does not jump categories', async ({ page }) => {
    // Currying links to Kleisli Composition in the graph, several categories deeper.
    // The suggestion follows the curriculum instead.
    await page.goto('/#/term/currying/practice/implement');
    await typeCode(page, 'const curry2 = (f) => (a) => (b) => f(a, b)');
    await expect(page.locator('.cleared')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /^Next: / })).toHaveCount(0);
  });
});

test.describe('expression rungs', () => {
  test('a wrong answer says what you produced without handing over the answer', async ({ page }) => {
    await page.goto('/#/term/arity/practice/recognize');
    await page.fill('.expr-input input', '[2, 3, 2, 2, 2]');
    await expect(page.locator('.check-detail')).toBeVisible({ timeout: 10000 });

    const detail = (await page.locator('.check-detail').textContent()) ?? '';
    expect(detail).toContain('[2, 3, 2, 2, 2]');
    // The answer is [2, 2, 0, 1, 1]. Seeing it here would make the rung pointless.
    expect(detail).not.toContain('0, 1, 1');
    await expect(page.locator('.cleared')).toHaveCount(0);
  });

  test('a right answer clears the rung', async ({ page }) => {
    await page.goto('/#/term/arity/practice/recognize');
    await page.fill('.expr-input input', '[a.length, b.length, c.length, d.length, e.length]');
    await expect(page.locator('.tally')).toHaveText('1 / 1 passing', { timeout: 10000 });
    await expect(page.locator('.cleared')).toBeVisible();
  });

  test('the answer is available once the hints run out', async ({ page }) => {
    await page.goto('/#/term/arity/practice/recognize');
    await page.getByRole('button', { name: 'Show a hint' }).click();
    await page.getByRole('button', { name: 'Another hint' }).click();
    await page.getByRole('button', { name: 'Show the answer' }).click();
    await expect(page.locator('.solution')).toContainText('a.length');
  });

  test('an unfinished expression is reported as a syntax error', async ({ page }) => {
    await page.goto('/#/term/arity/practice/recognize');
    await page.fill('.expr-input input', '[1, 2');
    await expect(page.locator('.fatal')).toContainText('SyntaxError', { timeout: 10000 });
  });

  test('the answer survives a reload', async ({ page }) => {
    await page.goto('/#/term/total-function/practice/recognize');
    await page.fill('.expr-input input', "[0, 1, '', true]");
    await expect(page.locator('.cleared')).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.locator('.expr-input input')).toHaveValue("[0, 1, '', true]");
  });
});
