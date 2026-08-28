<script setup lang="ts">
/**
 * The mark inside a window control — minimize, maximize, restore, close.
 *
 * Drawn rather than typed. These used to be text (`—`, `▢`, `❐`, `×`), which
 * meant their weight and size came from whatever font the theme was wearing
 * and no two of them lined up with each other. A path on a 10×10 grid is the
 * same mark everywhere, and the one thing a theme has to be able to change —
 * a Mac zooms with a pair of arrowheads where everyone else draws a square —
 * is a second path the stylesheet swaps in.
 *
 * Which is why both drawings ship in the markup and CSS picks between them:
 * the glyph follows `[data-dc-theme]`, and the theme is an attribute on an
 * ancestor rather than a prop this component is handed.
 */

export type WindowGlyphKind = 'minimize' | 'unroll' | 'maximize' | 'restore' | 'close'

defineProps<{ kind: WindowGlyphKind }>()

/**
 * Stroked on the 10×10 grid, inset far enough that a round cap stays inside
 * the box at any weight.
 */
const LINE: Record<WindowGlyphKind, string[]> = {
  minimize: ['M2 5h6'],
  // Rolled up, the window is its own bar. A second square beside the maximize
  // one would be a riddle at this size; what unrolls is the body coming back
  // down, so that is the mark.
  unroll: ['M2.4 4l2.6 2.6L7.6 4'],
  maximize: ['M2.5 2.5h5v5h-5z'],
  // The near square, with the one it came from behind it.
  restore: ['M2 4.5h3.5V8H2z', 'M4 4.5V2h4v4H5.5'],
  close: ['M2.4 2.4l5.2 5.2', 'M7.6 2.4l-5.2 5.2'],
}

/**
 * What macOS draws where it draws something else. Zoom is a pair of
 * arrowheads — out of the corners to fill the screen, back into the middle to
 * leave it — and the yellow light is a bar whichever way round the window is,
 * since a Mac never marks the two states apart. Filled shapes, all of them:
 * these are what a solid light carries, not hairlines.
 */
const AQUA: Partial<Record<WindowGlyphKind, string[]>> = {
  minimize: ['M2.2 4.3h5.6v1.4H2.2z'],
  unroll: ['M2.2 4.3h5.6v1.4H2.2z'],
  maximize: ['M8.4 1.6v4.2l-4.2-4.2z', 'M1.6 8.4v-4.2l4.2 4.2z'],
  restore: ['M5 5h4.2L5 0.8z', 'M5 5H0.8L5 9.2z'],
}
</script>

<template>
  <svg
    class="dc-glyph"
    :data-dc-glyph="kind"
    viewBox="0 0 10 10"
    aria-hidden="true"
    focusable="false"
  >
    <g class="dc-glyph__line">
      <path
        v-for="d in LINE[kind]"
        :key="d"
        :d="d"
      />
    </g>
    <g
      v-if="AQUA[kind]"
      class="dc-glyph__aqua"
    >
      <path
        v-for="d in AQUA[kind]"
        :key="d"
        :d="d"
      />
    </g>
  </svg>
</template>

<style scoped>
.dc-glyph {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  /* Follows the button's own colour, hover states and all. */
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
  stroke-linecap: round;
  stroke-linejoin: round;
  /* The glyph is never the click target; the button around it is. */
  pointer-events: none;
}

/* Only ever one of the two drawings. */
.dc-glyph__aqua {
  display: none;
}

[data-dc-theme='macos'] .dc-glyph:has(.dc-glyph__aqua) .dc-glyph__line {
  display: none;
}

[data-dc-theme='macos'] .dc-glyph__aqua {
  display: initial;
  fill: currentColor;
  stroke: none;
}

/*
 * A Mac's marks sit inside a 12px light, so they are drawn smaller and heavier
 * than the hairline everyone else gets: at that size a 1px stroke disappears
 * into the colour behind it.
 */
[data-dc-theme='macos'] .dc-glyph {
  width: 8px;
  height: 8px;
  stroke-width: 1.5;
}

/* Fluent's title bar marks are a true hairline, and square-cut. */
[data-dc-theme='windows'] .dc-glyph {
  stroke-width: 0.9;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}
</style>
