---
'@telamonjs/queue': patch
---

`FlowProducer.add()` validates the merged options of every node, like `QueueManager.add()` and `addBulk()`: invalid options (e.g. `attempts: -1`) throw `InvalidJobOptionsError` before any job of the flow is added, instead of reaching BullMQ.
