---
'@telamonjs/ui': patch
---

Sharing a saved view no longer copies an empty `?view=` link when its config holds text outside
Latin-1 (a search like `São João`): `encodeViewConfig` encodes the JSON as UTF-8 before base64.
ASCII-only configs encode exactly as before.
