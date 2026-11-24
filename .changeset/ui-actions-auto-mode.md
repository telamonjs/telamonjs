---
'@telamonjs/ui': minor
---

Row actions `display.mode: 'auto'` now does what it promised: every action goes into the "⋯" menu on mobile (below 768px, the `useIsMobile` breakpoint) and stays inline (with `maxInline`) elsewhere. It used to behave exactly like `'inline'`.
