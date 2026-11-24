---
'@telamonjs/ui': patch
'@telamonjs/cli': patch
---

Raise the minimum versions of runtime dependencies to the current minors (no peer range changes).

- `@telamonjs/ui`: `recharts` `~3.3.0` → `~3.11.0`; the `@radix-ui/react-*` primitives,
  `@tiptap/*` `^3.35.0`, `react-aria` `^3.53.1`, `react-stately` `^3.51.0`, `zustand` `^5.1.0`,
  `date-fns` `^4.4.0`, `dompurify` `^3.4.18`, `react-grid-layout` `^2.3.0`, `react-is` `^19.3.1`,
  `@tanstack/react-virtual` `^3.14.26`, `@uiw/react-textarea-code-editor` `^3.1.3` and
  `@vis.gl/react-google-maps` `^1.10.2`.
- `@telamonjs/cli`: `fs-extra` `^11.4.1`. Apps created by `create-telamonjs-app` pin the same
  updated versions (`@radix-ui/*`, `@auth/prisma-adapter`, `date-fns`, `zustand`, `postcss`,
  `autoprefixer`, `prettier`, `prettier-plugin-tailwindcss`, `tsx` and friends).
