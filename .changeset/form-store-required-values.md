---
'@telamonjs/ui': patch
---

`ZustandForm` / `useForm().validate()` accept `0` in a required field (it was reported as
missing) and reject an empty array (an empty required multiselect passed). `useForms().validateAll()`
now validates every form instead of stopping at the first invalid one, so later wizard steps get
their errors too.
