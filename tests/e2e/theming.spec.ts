import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { gotoStory, grip, pane, paneHead } from './story'

const styleOf = (page: Page, selector: string, property: string) =>
  page
    .locator(selector)
    .first()
    .evaluate(
      (el, name) => getComputedStyle(el).getPropertyValue(name),
      property,
    )

/*
 * The three buttons a window is closed, rolled up and zoomed by. They are one
 * group in the markup, written in one order — minimize, maximize, close — and
 * what each theme does with that group is the whole of the difference.
 */
test.describe('Theming — the window controls each system draws', () => {
  const control = (page: Page, kind: 'close' | 'minimize' | 'maximize') =>
    pane(page, 'activity').locator(`[data-dc-${kind}]`)

  const selector = (kind: string) => `.dc-pane[data-dc-panels~="activity"] [data-dc-${kind}]`

  const leftEdge = async (page: Page, kind: 'close' | 'minimize' | 'maximize') => {
    const box = await control(page, kind).boundingBox()
    if (!box) throw new Error(`No ${kind} control on screen`)
    return box.x
  }

  test('a Mac wears traffic lights, at the left of the bar and led by close', async ({ page }) => {
    await gotoStory(page, 'window-panel-grid--floating-on-macos')

    // Close, minimize, zoom: the order a Mac has always put them in, which is
    // the reverse of the order they are written in.
    expect(await leftEdge(page, 'close')).toBeLessThan(await leftEdge(page, 'minimize'))
    expect(await leftEdge(page, 'minimize')).toBeLessThan(await leftEdge(page, 'maximize'))

    // And the group ahead of everything else on the bar, grip included.
    const handle = await grip(page, 'activity').boundingBox()
    expect(await leftEdge(page, 'maximize')).toBeLessThan(handle!.x)

    // Each lit in its own colour, and round, with the pointer nowhere near.
    expect(await styleOf(page, selector('close'), 'background-color')).toBe('rgb(255, 95, 87)')
    expect(await styleOf(page, selector('minimize'), 'background-color')).toBe('rgb(254, 188, 46)')
    expect(await styleOf(page, selector('maximize'), 'background-color')).toBe('rgb(40, 200, 64)')
    expect(await styleOf(page, selector('close'), 'border-radius')).toBe('50%')

    // Lit but empty: at rest the bar carries three colours, not three symbols.
    for (const kind of ['close', 'minimize', 'maximize'] as const) {
      await expect(control(page, kind).locator('.dc-glyph')).toHaveCSS('opacity', '0')
    }

    // The pointer on any one of them fills in all three, as a Mac does.
    await control(page, 'minimize').hover()
    for (const kind of ['close', 'minimize', 'maximize'] as const) {
      await expect(control(page, kind).locator('.dc-glyph')).toHaveCSS('opacity', '1')
    }
  })

  test('Windows keeps them square, in the corner, and reddens the close', async ({ page }) => {
    await gotoStory(page, 'window-panel-grid--floating-on-windows')

    // The other way round: close is the outermost, at the right hand end.
    expect(await leftEdge(page, 'minimize')).toBeLessThan(await leftEdge(page, 'maximize'))
    expect(await leftEdge(page, 'maximize')).toBeLessThan(await leftEdge(page, 'close'))

    // Flush into the corner and the full height of the bar, as Fluent draws
    // them — the bar's own padding is taken back off for it.
    const bar = await paneHead(page, 'activity').boundingBox()
    const close = await control(page, 'close').boundingBox()
    expect(Math.abs(close!.x + close!.width - (bar!.x + bar!.width))).toBeLessThan(1.5)
    expect(Math.abs(close!.height - bar!.height)).toBeLessThan(1.5)
    expect(await styleOf(page, selector('close'), 'border-radius')).toBe('0px')

    // Nothing carries a colour until the pointer arrives, and then only close.
    expect(await styleOf(page, selector('close'), 'background-color')).toBe('rgba(0, 0, 0, 0)')
    await control(page, 'close').hover()
    expect(await styleOf(page, selector('close'), 'background-color')).toBe('rgb(196, 43, 28)')
    expect(await styleOf(page, selector('close'), 'color')).toBe('rgb(255, 255, 255)')
  })

  test('the marks are drawn, and a Mac swaps the one it draws differently', async ({ page }) => {
    await gotoStory(page, 'window-panel-grid--floating')

    // A path rather than a character, so a theme's typeface cannot reweigh it.
    await expect(control(page, 'maximize').locator('svg.dc-glyph')).toHaveCount(1)
    await expect(control(page, 'maximize')).toHaveText('')

    // Everyone draws a square to maximize with…
    expect(await styleOf(page, `${selector('maximize')} .dc-glyph__line`, 'display')).not.toBe('none')
    expect(await styleOf(page, `${selector('maximize')} .dc-glyph__aqua`, 'display')).toBe('none')

    // …and a Mac a pair of arrowheads, out of the same markup.
    await gotoStory(page, 'window-panel-grid--floating-on-macos')
    expect(await styleOf(page, `${selector('maximize')} .dc-glyph__line`, 'display')).toBe('none')
    expect(await styleOf(page, `${selector('maximize')} .dc-glyph__aqua`, 'display')).not.toBe('none')
  })
})
