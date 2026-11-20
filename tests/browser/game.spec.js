import { expect, test } from '@playwright/test';

const counter = (page, name) => page.getByRole('status', { name, exact: true });
const position = (page) => counter(page, 'Position');
const outcome = (page) => counter(page, 'Game status');

async function pressMoves(page, moves) {
  for (const key of moves) await page.keyboard.press(key);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(outcome(page)).toHaveText('Playing');
});

test('B01 arrow and uppercase WASD move and update remaining turns', async ({ page }) => {
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('D');
  await expect(position(page)).toHaveText('Row 1, column 3');
  await expect(counter(page, 'Turns remaining')).toHaveText('38');
});

test('B02 a wall and the board edge consume turns while Escape is ignored', async ({ page }) => {
  await page.getByLabel('Map').selectOption('crossing');
  await page.getByLabel('Map').blur();
  await page.keyboard.press('Escape');
  await expect(counter(page, 'Turns remaining')).toHaveText('40');
  await page.keyboard.press('ArrowUp');
  await expect(position(page)).toHaveText('Row 1, column 1');
  await expect(counter(page, 'Turns remaining')).toHaveText('39');
  await pressMoves(page, 'dd');
  await expect(position(page)).toHaveText('Row 1, column 2');
  await expect(counter(page, 'Turns remaining')).toHaveText('37');
});

test('B03 a crystal disappears and its score cannot be collected twice', async ({ page }) => {
  const crystal = page.getByText('Row 1, column 2: Crystal', { exact: true });
  await expect(crystal).toHaveCount(1);
  await pressMoves(page, 'dad');
  await expect(crystal).toHaveCount(0);
  await expect(counter(page, 'Score')).toHaveText('10');
  await expect(counter(page, 'Crystals remaining')).toHaveText('2');
});

test('B04 keyboard restart restores the selected map and its counters', async ({ page }) => {
  await page.getByLabel('Map').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Map')).toHaveValue('crossing');
  await expect(page.getByRole('button', { name: 'Restart' })).toBeFocused();
  await pressMoves(page, 'ssd');
  await expect(counter(page, 'Score')).toHaveText('10');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Map')).toHaveValue('crossing');
  await expect(position(page)).toHaveText('Row 1, column 1');
  await expect(counter(page, 'Score')).toHaveText('0');
  await expect(counter(page, 'Health')).toHaveText('3');
  await expect(counter(page, 'Turns remaining')).toHaveText('40');
  await expect(counter(page, 'Crystals remaining')).toHaveText('3');
});

test('B05 zero health displays a loss and prevents further movement', async ({ page }) => {
  await pressMoves(page, 'swsws');
  await expect(outcome(page)).toHaveText('You lost. No health remaining.');
  await expect(counter(page, 'Health')).toHaveText('0');
  await page.keyboard.press('ArrowUp');
  await expect(position(page)).toHaveText('Row 2, column 1');
  await expect(counter(page, 'Turns remaining')).toHaveText('35');
});

test('B06 the fortieth blocked attempt displays a turn-limit loss', async ({ page }) => {
  await pressMoves(page, 'w'.repeat(39));
  await expect(outcome(page)).toHaveText('Playing');
  await expect(counter(page, 'Turns remaining')).toHaveText('1');
  await page.keyboard.press('w');
  await expect(outcome(page)).toHaveText('You lost. No turns remaining.');
  await expect(counter(page, 'Turns remaining')).toHaveText('0');
});

const winningRoutes = {
  quarry: ['ddddddd', 33],
  crossing: ['ssdddwwddassassdsdssd', 19],
  grotto: ['dawwwwwdssddsdddwwwwd', 19],
  ridge: ['saasaawwaasddssssaaassddd', 15],
  spring: ['wwddssdssswwwaaasaaawwsssassd', 11],
  vault: ['wdddwddddwwwwwaaassaawwaa', 15],
};

for (const [mapId, [moves, remaining]] of Object.entries(winningRoutes)) {
  test(`B07-${mapId} wins on ${mapId} and restarts the same map`, async ({ page }) => {
    await page.getByLabel('Map').selectOption(mapId);
    await page.getByLabel('Map').blur();
    await pressMoves(page, moves);
    await expect(outcome(page)).toHaveText('You won. All crystals escaped!');
    await expect(counter(page, 'Score')).toHaveText('50');
    await expect(counter(page, 'Crystals remaining')).toHaveText('0');
    await expect(counter(page, 'Health')).toHaveText('3');
    await expect(counter(page, 'Turns remaining')).toHaveText(String(remaining));
    await page.keyboard.press('a');
    await expect(counter(page, 'Turns remaining')).toHaveText(String(remaining));
    await page.getByRole('button', { name: 'Restart' }).click();
    await expect(page.getByLabel('Map')).toHaveValue(mapId);
    await expect(outcome(page)).toHaveText('Playing');
    await expect(counter(page, 'Turns remaining')).toHaveText('40');
  });
}

test('B08 a narrow viewport preserves the board and suppresses arrow scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 420 });
  const board = page.getByRole('list', { name: 'Game board' });
  await expect(board.getByRole('listitem')).toHaveCount(64);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await page.evaluate(() => {
    window.addEventListener('keydown', (event) => {
      document.body.dataset.arrowDefaultPrevented = String(event.defaultPrevented);
    }, { once: true });
  });
  await page.keyboard.press('ArrowDown');
  await expect(position(page)).toHaveText('Row 2, column 1');
  await expect(page.locator('body')).toHaveAttribute('data-arrow-default-prevented', 'true');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
