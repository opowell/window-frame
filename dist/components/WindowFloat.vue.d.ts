import type { FloatFrame } from '../window/types';
type __VLS_Props = {
    frame: FloatFrame;
    /** Child indices from the root — where this frame sits in the tree. */
    path: number[];
    /** Place in the stack, counted from the back. */
    order: number;
    /**
     * Where it docks along the bottom when it is rolled up. Worked out by the
     * float, which is the only thing that knows how many others are rolled up
     * beside it — and `null` whenever this one is not.
     */
    place?: {
        x: number;
        bottom: number;
    } | null;
};
declare var __VLS_14: {};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_14) => any;
};
declare const __VLS_component: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
