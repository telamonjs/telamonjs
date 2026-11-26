---
'@telamonjs/ui': patch
---

`FileUpload` cancels its pending simulated uploads (no `uploadEndpoint`) when it unmounts, so no state update fires after the component is gone.
