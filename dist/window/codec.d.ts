import type { WindowNode } from './types';
/** A layout as one line of text, for an address bar or anywhere else that keeps text. */
export declare function encodeLayout(node: WindowNode): string;
/**
 * The layout {@link encodeLayout} wrote, or `null` for anything it could not
 * have — a URL is typed into and pasted from, and a mangled one should open
 * the window as it would with none rather than throw. What comes back is
 * well-formed but not reconciled: it may name panels the host no longer has,
 * which `WindowFrame` squares with its panels the way it does any layout.
 */
export declare function decodeLayout(source: string): WindowNode | null;
