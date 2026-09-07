import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import type { DropEdge } from '../../src/window/types'

/**
 * Storybook renders each story in an iframe at `/iframe.html?id=<story-id>`.
 * Driving that directly rather than the manager UI keeps the tests about the
 * component, and lets a test read and assert on the page's own URL.
 */
export function storyUrl(id: string, extraSearch = ''): string {
  return `/iframe.html?id=${id}&viewMode=story${extraSearch}`
}

/** Navigates to a story and waits for the shell to be on screen. */
export async function gotoStory(page: Page, id: string, extraSearch = ''): Promise<void> {
  await page.goto(storyUrl(id, extraSearch))
  await page.locator('.dc-shell').first().waitFor({ state: 'visible' })
}

export const header = (page: Page) => page.locator('.dc-header')

/** The bar itself, which is the surface a press anywhere on opens the panel. */
export const headerBar = (page: Page) => page.locator('.dc-header__trigger')

/**
 * What that surface does, as the button that carries it: the chevron holds
 * `aria-expanded`, names the panel it controls, and is what a keyboard reaches.
 */
export const trigger = (page: Page) => page.locator('.dc-header__toggle')
/** The row the query sits in: its two choosers, and a pill per part of it. */
export const termBar = (page: Page) => page.locator('.dc-header__terms')

/** Each part, as its own button. Pressing one takes that part out of the query. */
export const terms = (page: Page) => page.locator('.dc-term')

/**
 * One of the two parts of the query that are not pills: which type is being
 * listed, offered as a choice among the schema's own — `Everything` among them.
 */
export const scopeSelect = (page: Page) => page.locator('.dc-header__scope-select')

/** And the other: how the results are drawn. */
export const viewSelect = (page: Page) => page.locator('.dc-header__view-select')

/**
 * What the type control says it is listing: the type's name and, after it, how
 * many records that is.
 */
export async function scopeLabel(page: Page): Promise<string> {
  const chosen = await scopeSelect(page).locator('option:checked').textContent()
  return (chosen ?? '').trim()
}

/**
 * Lists another type from the header, by the name the schema gave it. The
 * option says a count after that name, so the match is on the name alone.
 */
export async function chooseScope(page: Page, label: string): Promise<void> {
  const option = scopeSelect(page).locator('option').filter({ hasText: label }).first()
  await scopeSelect(page).selectOption((await option.getAttribute('value')) ?? '')
}
export const panel = (page: Page) => page.locator('.dc-panel')

/**
 * The panel's own query field: the box an expression is typed into, and the
 * parts standing in front of it — one per `field:value` term the query
 * already names, each of them a button that takes itself out.
 */
export const expressionBox = (page: Page) => page.locator('.dc-expression')
export const parts = (page: Page) => page.locator('.dc-part')
export const listRows = (page: Page) => page.locator('.dc-list__row')

/**
 * The header's paging control, which is only in the bar when there is more
 * than one page — so its absence is an assertion worth making too.
 */
export const pager = (page: Page) => page.locator('.dc-header__pages')

/** Its readout: which page of how many. */
export const pageReadout = (page: Page) => page.locator('.dc-header__page')

export const pageStep = (page: Page, which: 'Previous' | 'Next') =>
  pager(page).getByRole('button', { name: `${which} page` })

/** Steps a page and waits for the readout to say it has moved. */
export async function stepPage(page: Page, which: 'Previous' | 'Next'): Promise<void> {
  const before = await pageReadout(page).innerText()
  await pageStep(page, which).click()
  await expect(pageReadout(page)).not.toHaveText(before)
}

/** The leading ordinal of each row on screen, which counts the whole result. */
export function rowOrdinals(page: Page): Promise<string[]> {
  return listRows(page).locator('.dc-list__ordinal').allTextContents()
}

/** Opens the query panel by clicking the header, as a user would. */
export async function openPanel(page: Page): Promise<void> {
  await trigger(page).click()
  await panel(page).waitFor({ state: 'visible' })
}

/**
 * The scope card for one entity, matched on its label exactly. A loose text
 * match would also hit the "Everything" card, whose own description mentions
 * logs and settings.
 */
export const entityCard = (page: Page, label: string) =>
  page.locator('.dc-entity').filter({
    has: page.locator('.dc-entity__label', { hasText: new RegExp(`^${label}$`) }),
  })

/** Filters the results to one entity through the query panel. */
export async function pickEntity(page: Page, label: string): Promise<void> {
  await entityCard(page, label).click()
}

/**
 * Clicks the scrim at a point the panel does not cover — below it if there is
 * room, otherwise in the gutter beside it.
 */
export async function clickOutsidePanel(page: Page): Promise<void> {
  const box = await panel(page).boundingBox()
  if (!box) throw new Error('Query panel is not on screen')
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('No viewport')

  const below = box.y + box.height + 20
  if (below < viewport.height - 4) await page.mouse.click(viewport.width / 2, below)
  else await page.mouse.click(Math.max(2, box.x / 2), box.y + box.height / 2)
}

/** The shell's own query parameters, with Storybook's stripped out. */
export function shellParams(url: string): Record<string, string> {
  const params = new URL(url).searchParams
  const own: Record<string, string> = {}
  for (const [key, value] of params) {
    if (key === 'id' || key === 'viewMode' || key === 'globals') continue
    own[key] = value
  }
  return own
}

/* ------------------------------------------------------------------ window */

/**
 * The pane a panel is in, whether its tab is the one on show or one behind it.
 * `data-dc-panel` is the tab on top; `data-dc-panels` is the whole strip.
 */
export const pane = (page: Page, id: string): Locator =>
  page.locator(`.dc-pane[data-dc-panels~="${id}"]`)

export const paneHead = (page: Page, id: string): Locator =>
  pane(page, id).locator('.dc-pane__head')

export const grip = (page: Page, id: string): Locator =>
  pane(page, id).locator('.dc-pane__grip')

/** The panel showing in each pane, in the order the layout lays them out. */
export function panelOrder(page: Page): Promise<string[]> {
  return page
    .locator('.dc-pane')
    .evaluateAll((panes) => panes.map((element) => (element as HTMLElement).dataset.dcPanel ?? ''))
}

/** A pane's box, for the geometric assertions a layout is really made of. */
export async function boxOf(page: Page, id: string) {
  const box = await pane(page, id).boundingBox()
  if (!box) throw new Error(`Panel ${id} is not on screen`)
  return box
}

/** The point inside a pane that means "drop here". */
function dropPoint(box: { x: number; y: number; width: number; height: number }, edge: DropEdge) {
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  if (edge === 'center') return middle
  if (edge === 'left') return { x: box.x + box.width * 0.08, y: middle.y }
  if (edge === 'right') return { x: box.x + box.width * 0.92, y: middle.y }
  if (edge === 'top') return { x: middle.x, y: box.y + box.height * 0.08 }
  return { x: middle.x, y: box.y + box.height * 0.92 }
}

/**
 * Presses a panel where a user would pick it up. Every panel has a tab — a
 * pane of one shows it as a title — and that tab is what carries it, so
 * grabbing a panel in a tabbed pane means grabbing its own tab rather than
 * whatever the header happens to have at that point.
 */
async function pressPanel(page: Page, id: string): Promise<void> {
  const handle = await tab(page, id).boundingBox()
  if (!handle) throw new Error(`Panel ${id} has no tab on screen`)
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
}

/**
 * Picks a panel up and carries it over part of another, leaving the button
 * down so a test can assert on the preview. Real pointer events rather than
 * the HTML5 drag protocol, which is what the component listens for.
 */
export async function pickUpPanel(
  page: Page,
  id: string,
  target: string,
  edge: DropEdge,
): Promise<void> {
  const to = dropPoint(await boxOf(page, target), edge)
  await pressPanel(page, id)
  // In steps, so the component sees the travel that distinguishes a drag from
  // a click, and every drop target it passes over.
  await page.mouse.move(to.x, to.y, { steps: 12 })
}

export async function dropPanel(page: Page): Promise<void> {
  await page.mouse.up()
}

/** Carries a panel onto part of another and lets go. */
export async function dragPanel(
  page: Page,
  id: string,
  target: string,
  edge: DropEdge,
): Promise<void> {
  await pickUpPanel(page, id, target, edge)
  await dropPanel(page)
}

/** The splitter between two panes, of which there is one per neighbouring pair. */
export const gutters = (page: Page): Locator => page.locator('.dc-window__gutter')

/** A panel's tab, wherever in the window its pane is. */
export const tab = (page: Page, id: string): Locator =>
  page.locator(`.dc-tab[data-dc-panel="${id}"]`)

/**
 * The tabs of the pane a panel is in, in strip order — this pane's own strip
 * rather than the strips of any panes inside it, which a space sharing this one
 * brings with it.
 */
export function tabOrder(page: Page, id: string): Promise<string[]> {
  return pane(page, id)
    .locator('> .dc-pane__head .dc-tab')
    .evaluateAll((tabs) => tabs.map((element) => (element as HTMLElement).dataset.dcPanel ?? ''))
}

/**
 * A space's own tab, where a space shares a strip with the panes it was
 * collapsed in with — `Desktop`, `Row`, `Column`, or whatever it is named.
 */
export const spaceTab = (page: Page, title: string): Locator =>
  page.locator(`.dc-tab[data-dc-space="${title}"]`)

/**
 * The name a strip says for the space it *is*, in front of its tabs — the
 * fourth shape's answer to the header a row, a column and a desktop draw.
 */
export const stripName = (page: Page): Locator => page.locator('.dc-pane__name')

/**
 * What the tabs of a pane say, in strip order — a panel's title, or the name of
 * a space sharing the strip. `tabOrder` reads ids, which a space tab has none
 * of: it is a space rather than a panel.
 */
export function tabNames(page: Page, id: string): Promise<string[]> {
  return pane(page, id).locator('> .dc-pane__head .dc-tab .dc-tab__name').allTextContents()
}

/** Carries a panel onto a gap in another pane's tab strip. */
export async function dragToTab(
  page: Page,
  id: string,
  targetTab: string,
  side: 'before' | 'after',
): Promise<void> {
  const to = await tab(page, targetTab).boundingBox()
  if (!to) throw new Error(`Panel ${targetTab} has no tab on screen`)

  await pressPanel(page, id)
  // Inside the target tab, on the side that decides which gap it lands in.
  const x = side === 'before' ? to.x + to.width * 0.2 : to.x + to.width * 0.8
  await page.mouse.move(x, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
}

/* ------------------------------------------------------------------ floats */

/** The floating frame a panel is in. */
export const floatFrame = (page: Page, id: string): Locator =>
  page.locator('.dc-float').filter({ has: page.locator(`.dc-pane[data-dc-panels~="${id}"]`) })

export async function frameBox(page: Page, id: string) {
  const box = await floatFrame(page, id).boundingBox()
  if (!box) throw new Error(`Panel ${id} is not in a floating frame`)
  return box
}

/**
 * The panel on top of each floating frame, back to front — the stacking order.
 *
 * Read from `data-dc-order` rather than from the order of the elements: the
 * window renders its frames in a stable order and stacks them with `z-index`,
 * so that raising one does not rebuild everything inside it.
 */
export function frameOrder(page: Page): Promise<string[]> {
  return page.locator('.dc-float').evaluateAll((frames) =>
    frames
      .map((element) => ({
        order: Number((element as HTMLElement).dataset.dcOrder ?? 0),
        panel: element.querySelector<HTMLElement>('.dc-pane')?.dataset.dcPanel ?? '',
      }))
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.panel),
  )
}

/**
 * Presses a floating frame's title bar clear of its tabs and its controls —
 * the strip's own background, which is what carries the window. Pressing a tab
 * would pick the *panel* up instead, which is a different gesture entirely.
 */
export async function titleBarPoint(page: Page, id: string): Promise<{ x: number; y: number }> {
  const frame = floatFrame(page, id)
  const strip = await frame.locator('.dc-pane__tabs').first().boundingBox()
  const last = await frame.locator('.dc-tab').last().boundingBox()
  if (!strip || !last) throw new Error(`Panel ${id} has no title bar on screen`)

  return {
    x: Math.min(last.x + last.width + 12, strip.x + strip.width - 4),
    y: strip.y + strip.height / 2,
  }
}

async function pressTitleBar(page: Page, id: string): Promise<{ x: number; y: number }> {
  const point = await titleBarPoint(page, id)
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  return point
}

/** Double-clicks a floating window's title bar, clear of its tabs and controls. */
export async function doubleClickTitleBar(page: Page, id: string): Promise<void> {
  const point = await titleBarPoint(page, id)
  await page.mouse.dblclick(point.x, point.y)
}

/** Carries a floating frame by its title bar, leaving the button down. */
export async function pickUpFrame(
  page: Page,
  id: string,
  dx: number,
  dy: number,
): Promise<void> {
  const from = await pressTitleBar(page, id)
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 })
}

/** Carries a floating frame by its title bar and lets go. */
export async function dragFrame(page: Page, id: string, dx: number, dy: number): Promise<void> {
  await pickUpFrame(page, id, dx, dy)
  await page.mouse.up()
}

export const frameGrip = (page: Page, id: string, handle: string): Locator =>
  floatFrame(page, id).locator(`.dc-float__grip[data-dc-handle="${handle}"]`)

/*
 * A window addressed by where it is, rather than by a panel in it — the way its
 * own chrome addresses it. A window holding a desktop shares every panel with
 * the windows on that desktop, so a panel names one of *them*; the path it was
 * rendered at names the window itself.
 */

/** The floating frame at a path — `'1'` for the second window of the root float. */
export const frameAtPath = (page: Page, path: string): Locator =>
  page.locator(`.dc-float[data-dc-path="${path}"]`)

export async function frameBoxAt(page: Page, path: string) {
  const box = await frameAtPath(page, path).boundingBox()
  if (!box) throw new Error(`No floating frame at ${path}`)
  return box
}

/** The bar a window holding a space draws for it: title, menu and controls. */
export const frameBarAt = (page: Page, path: string): Locator =>
  frameAtPath(page, path).locator('> .dc-float__bar')

/** Carries the window at a path by its own title bar and lets go. */
export async function dragFrameAt(
  page: Page,
  path: string,
  dx: number,
  dy: number,
): Promise<void> {
  const bar = await frameBarAt(page, path).boundingBox()
  if (!bar) throw new Error(`No title bar on the frame at ${path}`)
  // Left of the controls, which are at the far end of the bar.
  const x = bar.x + Math.min(bar.width * 0.3, 80)
  const y = bar.y + bar.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 10 })
  await page.mouse.up()
}

/** Drags one of the eight resize grips of the window at a path. */
export async function dragFrameGripAt(
  page: Page,
  path: string,
  handle: string,
  dx: number,
  dy: number,
): Promise<void> {
  const box = await frameAtPath(page, path)
    .locator(`> .dc-float__grip[data-dc-handle="${handle}"]`)
    .boundingBox()
  if (!box) throw new Error(`No ${handle} grip on the frame at ${path}`)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 10 })
  await page.mouse.up()
}

/** Drags one of a floating frame's eight resize grips. */
export async function dragFrameGrip(
  page: Page,
  id: string,
  handle: string,
  dx: number,
  dy: number,
): Promise<void> {
  const box = await frameGrip(page, id, handle).boundingBox()
  if (!box) throw new Error(`Panel ${id} has no ${handle} grip on screen`)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 10 })
  await page.mouse.up()
}

/** The float a window is on — the space its frames are placed over. */
export const desktop = (page: Page): Locator => page.locator('.dc-window__desktop')

export async function desktopBox(page: Page) {
  const box = await desktop(page).first().boundingBox()
  if (!box) throw new Error('No float on screen')
  return box
}

/**
 * Carries a panel onto a float's bare desktop, at a point measured from the
 * desktop's own top-left. Leaves the button down so a test can assert on the
 * preview before the drop decides anything.
 */
export async function pickUpOntoDesktop(
  page: Page,
  id: string,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  const box = await desktopBox(page)
  await pressPanel(page, id)
  await page.mouse.move(box.x + offsetX, box.y + offsetY, { steps: 12 })
}

/** Carries a panel onto a float's bare desktop and lets go. */
export async function dragOntoDesktop(
  page: Page,
  id: string,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  await pickUpOntoDesktop(page, id, offsetX, offsetY)
  await page.mouse.up()
}

/** The outline showing the window a drop on bare desktop would make. */
export const desktopDrop = (page: Page): Locator => page.locator('.dc-window__drop')

/** The pane a drop into a space that holds nothing would fill it with. */
export const spaceDrop = (page: Page): Locator => page.locator('.dc-space__drop')

/**
 * Carries a panel over the middle of a space, named by the path it sits at —
 * how a space with nothing in it is aimed at, having no pane to aim for.
 */
export async function pickUpOntoSpace(page: Page, id: string, path: string): Promise<void> {
  const box = await space(page, path).boundingBox()
  if (!box) throw new Error(`No space at ${path}`)
  await pressPanel(page, id)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 })
}

/** Carries a panel into a space and lets go. */
export async function dragOntoSpace(page: Page, id: string, path: string): Promise<void> {
  await pickUpOntoSpace(page, id, path)
  await page.mouse.up()
}

/* ------------------------------------------------------------------ spaces */

/**
 * The panel a space draws for itself, by the path it sits at — `''` for the
 * root, `'1'` for the second child of it, and so on. The path rather than the
 * mode, because tiling a desktop leaves two rows on screen and only the path
 * tells them apart.
 */
export const space = (page: Page, path = ''): Locator =>
  page.locator(`.dc-space[data-dc-path="${path}"]`)

/** How a space says it is shown: `row`, `column` or `desktop`. */
export const spaceMode = async (page: Page, path = ''): Promise<string | null> =>
  space(page, path).getAttribute('data-dc-space')

/** The button that opens a space's own menu, from its title bar. */
export const spaceMenuButton = (page: Page, path = ''): Locator =>
  space(page, path).locator('> .dc-space__head .dc-menu-button')

/** Opens a space's menu and chooses one item of it, opening submenus on the way. */
export async function chooseSpaceMenu(page: Page, path: string, ...items: string[]): Promise<void> {
  await spaceMenuButton(page, path).click()
  await menus(page).first().waitFor({ state: 'visible' })
  for (const item of items) await menuItem(page, item).click()
}

/* ------------------------------------------------------------------- menus */

/** The button that opens a pane's own menu. */
export const paneMenuButton = (page: Page, id: string): Locator =>
  pane(page, id).locator('.dc-menu-button')

/**
 * The button that opens the menu on a floating window's own title bar — the
 * menu of the space that window holds.
 */
export const frameMenuButton = (page: Page, id: string): Locator =>
  frameBar(page, id).locator('.dc-menu-button')

/** An open menu, of which there is one level per submenu. */
export const menus = (page: Page): Locator => page.locator('.dc-menu')

/** An item of an open menu, by the id its definition gave it. */
export const menuItem = (page: Page, item: string): Locator =>
  page.locator(`.dc-menu__item[data-dc-item="${item}"]`)

/** The headings of an open menu, in the order they are read. */
export const menuHeadings = (page: Page): Locator => menus(page).first().locator('.dc-menu__heading')

/**
 * The items under one heading, found by the name it says: a heading names the
 * group it is over, and the group is what holds the items it named.
 */
export const menuGroup = (page: Page, name: string): Locator =>
  menus(page).first().locator(`[role="group"][aria-label="${name}"] > .dc-menu__item`)

/** Opens a pane's menu and waits for it to be up. */
export async function openPaneMenu(page: Page, id: string): Promise<void> {
  await paneMenuButton(page, id).click()
  await menus(page).first().waitFor({ state: 'visible' })
}

/** Opens a pane's menu and chooses one item of it, opening submenus on the way. */
export async function choosePaneMenu(page: Page, id: string, ...path: string[]): Promise<void> {
  await openPaneMenu(page, id)
  for (const item of path) await menuItem(page, item).click()
}

/** A top-level menu of the menu bar, by its id or its label. */
export const menubarItem = (page: Page, name: string): Locator =>
  page.locator(`.dc-menubar__item[data-dc-menu="${name}"]`)

/** Opens a menu bar menu and chooses one item of it. */
export async function chooseMenu(page: Page, menu: string, ...path: string[]): Promise<void> {
  await menubarItem(page, menu).click()
  for (const item of path) await menuItem(page, item).click()
}

/** A panel's close button — on its tab in a tabbed pane, in the tools if not. */
export const closeButton = (page: Page, id: string): Locator =>
  page.locator(`[data-dc-close="${id}"]`)

/**
 * A floating window's maximize button — the one that can actually be pressed.
 *
 * A rolled-up window shows its own title bar while the pane whose strip would
 * otherwise have been the title is still in the DOM, hidden, with a button of
 * its own. `:visible` picks the one a user is looking at.
 */
export const maximizeButton = (page: Page, id: string): Locator =>
  page.locator(`[data-dc-maximize="${id}"]:visible`)

/** The title bar a floating frame draws when it holds a grid rather than a group. */
export const frameBar = (page: Page, id: string): Locator =>
  floatFrame(page, id).locator('.dc-float__bar')

/** A floating window's minimize button — the one that can actually be pressed. */
export const minimizeButton = (page: Page, id: string): Locator =>
  page.locator(`[data-dc-minimize="${id}"]:visible`)
