---
'@telamonjs/ui': patch
---

Saved views: a stored or imported view whose `config` is `null` is now rejected like any other
malformed entry. It used to pass validation (`typeof null === 'object'`) and crash the table when
applied.
