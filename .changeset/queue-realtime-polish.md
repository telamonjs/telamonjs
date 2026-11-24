---
'@telamonjs/ui': patch
---

Queue dashboard polish. The Real-time queue tables fit their panel: they no longer force a 704px minimum width (horizontal scroll, "Actions" cut off, job name hidden next to the "Late" badge); the job name truncates with a tooltip, status badges wrap below it and the action buttons wrap inside their column. Toasts and the Run Job dialog name the job through `jobLabel` instead of the raw id (enable/disable, settings saved, queue actions, dispatch). pt-BR: missing accents in the Run Job dialog messages.
