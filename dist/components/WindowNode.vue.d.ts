import type { WindowNode } from '../window/types';
type __VLS_Props = {
    node: WindowNode;
    /** Child indices from the root — how a resize addresses this split. */
    path: number[];
    /**
     * Whether this node *is* a floating window's whole content. A space that is
     * draws no title bar of its own: the frame around it already has one, it is
     * the only place that window can be taken hold of, and two bars saying the
     * same name is one more than the space has.
     */
    framed?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
