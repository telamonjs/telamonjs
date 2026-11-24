---
'@telamonjs/ui': patch
---

`DispatchJobModal` sends an `array` schema field as an array: the input (whose placeholder asks
for `["id1", "id2"]`) is parsed as JSON instead of being dispatched as the raw string, and a value
that is not a JSON array is refused with the "invalid JSON" toast. Each field label is now
associated with its input.
