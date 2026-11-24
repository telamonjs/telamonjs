---
'@telamonjs/logger': patch
---

Logging never throws on a hard-to-serialize context any more: a `BigInt` value (a Prisma `BigInt`
id, say) is written as its decimal string instead of making `logger.info()` throw
"Do not know how to serialize a BigInt", and `PrettyLogger` now cleans its context like the other
adapters, so a circular value prints `[Circular]` instead of throwing and an `Error` keeps its
message and stack instead of printing `{}`.
