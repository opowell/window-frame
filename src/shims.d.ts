/**
 * Style sheets are imported for their side effect — Vite extracts them into
 * `dist/style.css` at build time. TypeScript needs the module to exist before
 * it will allow the import (TS2882); this declares it as empty, which is what
 * `vite/client` does. Declared here rather than pulled in through
 * `compilerOptions.types` so it also covers the build program, which sets
 * `"types": []`.
 */
declare module '*.css' {}
