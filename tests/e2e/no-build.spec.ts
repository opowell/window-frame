import { expect, test } from '@playwright/test'
import { choosePaneMenu, closeButton, dragPanel, pane, storyUrl } from './story'

/**
 * The static page under test. It is served by Storybook's `staticDirs` exactly
 * as it sits on disk, so these tests drive it directly rather than through a
 * story — the story only frames it, and the last test here checks that it does.
 *
 * Everything below reads `dist/`. A stale build fails these tests, which is the
 * point of having them.
 */
const PAGE = '/no-build/index.html'

/** Waits for the page to have finished running its own checks. */
const verdict = (page: import('@playwright/test').Page) => page.locator('#verdict[data-done="true"]')

const check = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`.nb-check[data-check="${id}"]`)

const WINDOW = PAGE

test.describe('No build — the panel grid, from dist', () => {
  test('every check the page runs on itself passes', async ({ page }) => {
    await page.goto(WINDOW)
    await expect(verdict(page)).toHaveAttribute('data-ok', 'true')
    await expect(page.locator('.nb-check[data-ok="false"]')).toHaveCount(0)

    // Named rather than counted, so a check quietly disappearing is a failure
    // too — an empty checklist would otherwise pass.
    for (const id of ['vue', 'window', 'shell', 'fixtures', 'loader', 'compile', 'mount', 'style'])
      await expect(check(page, id)).toHaveAttribute('data-ok', 'true')

    // The mount check names what it found, so a window that came up empty
    // could not report three panes.
    await expect(check(page, 'mount')).toContainText('3 panes')
    await expect(check(page, 'compile')).toContainText('WindowApp.vue')
    await expect(check(page, 'compile')).toContainText('ItemsPanel.vue')
    await expect(check(page, 'compile')).toContainText('SourcesPanel.vue')
  })

  test('the panels the host filled with its own SFCs are the real thing', async ({ page }) => {
    await page.goto(WINDOW)
    await page.locator('.dc-window').waitFor({ state: 'visible' })

    // The worked panel: a component of the host's, compiled in the page,
    // running a real query through the library's composables.
    await expect(pane(page, 'items').locator('.dc-table__row').first()).toBeVisible()

    // The plainer one: its own markup, a StatusPill out of the bundle, and a
    // scoped style that only exists because the loader injected it.
    const sources = pane(page, 'sources')
    await expect(sources.locator('.host-sources__row')).toHaveCount(5)
    await expect(sources.locator('.host-sources__row .dc-pill')).toHaveCount(5)
    await expect(sources.locator('.host-sources__row').first()).toHaveCSS(
      'display',
      'flex',
    )
  })

  test('the window drives that runtime-compiled panel through its own menu', async ({ page }) => {
    await page.goto(WINDOW)
    const items = pane(page, 'items')
    await expect(items.locator('.dc-table')).toBeVisible()

    await choosePaneMenu(page, 'items', 'view', 'view-cards')
    await expect(items.locator('.dc-cards')).toBeVisible()
    await expect(items.locator('.dc-table')).toHaveCount(0)
    // The panel beside it, another host SFC, is untouched.
    await expect(pane(page, 'sources')).toContainText('Hacker News')
  })

  test('and starts on the view the URL asked the host for', async ({ page }) => {
    await page.goto(`${WINDOW}?view=cards`)
    await expect(pane(page, 'items').locator('.dc-cards')).toBeVisible()
    // The checks have to hold on every view, not only the default one.
    await expect(verdict(page)).toHaveAttribute('data-ok', 'true')
  })

  test('panels still drag and close, with the host answering the close', async ({ page }) => {
    await page.goto(WINDOW)
    await page.locator('.dc-window').waitFor({ state: 'visible' })

    // A drop in the middle makes it a tab of the panel it landed on.
    await dragPanel(page, 'activity', 'sources', 'center')
    await expect(pane(page, 'sources')).toHaveAttribute('data-dc-panels', /activity/)

    // Closing is a request the window emits and `WindowApp.vue` answers by
    // filtering its own `panels` — so a pane that goes is the host's doing.
    await closeButton(page, 'activity').click()
    await expect(pane(page, 'activity')).toHaveCount(0)
    await expect(pane(page, 'sources').locator('.host-sources__row')).toHaveCount(5)
  })

  test('and the checks fail when the stylesheets are missing', async ({ page }) => {
    await page.goto(`${WINDOW}?no-css`)
    await expect(verdict(page)).toHaveAttribute('data-ok', 'false')
    await expect(check(page, 'style')).toHaveAttribute('data-ok', 'false')

    // Only that one: the window without its stylesheets still loads, compiles
    // and mounts, which is what makes the failure specific.
    await expect(page.locator('.nb-check[data-ok="false"]')).toHaveCount(1)
    await expect(check(page, 'mount')).toHaveAttribute('data-ok', 'true')
  })

  test('the story frames that same page', async ({ page }) => {
    await page.goto(storyUrl('no-build-static-page--panel-grid'))
    const frame = page.frameLocator('iframe[title="window-frame with no build step"]')
    await expect(frame.locator('#verdict[data-done="true"]')).toHaveAttribute('data-ok', 'true')
    await expect(frame.locator('.dc-window')).toBeVisible()
  })
})
