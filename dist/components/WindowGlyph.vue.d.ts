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
export type WindowGlyphKind = 'minimize' | 'unroll' | 'maximize' | 'restore' | 'close';
type __VLS_Props = {
    kind: WindowGlyphKind;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
