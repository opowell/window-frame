import type { WindowGroup, WindowNode } from '../window/types';
type __VLS_Props = {
    group: WindowGroup;
    /** Child indices from the root — how a space sharing this strip is addressed. */
    path: number[];
};
declare var __VLS_18: {
    node: WindowNode;
    path: number[];
};
type __VLS_Slots = {} & {
    space?: (props: typeof __VLS_18) => any;
};
declare const __VLS_component: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
