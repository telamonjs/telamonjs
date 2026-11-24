---
'@telamonjs/ui': patch
---

`useFormStore().setFormData()` (which `useForm(formId, initialData)` and `ZustandForm` call to load
the record) no longer marks the form dirty. Loading data is the baseline, like react-hook-form's
`reset()`: `isDirty` / `useForms().anyDirty` now turn `true` only after a field is edited
(`updateField`), so they can drive an unsaved-changes guard. Before, every form was dirty as soon as
it opened.
