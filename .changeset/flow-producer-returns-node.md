---
'@telamonjs/queue': minor
---

`FlowProducer.add()` returns the created flow (BullMQ `JobNode`) instead of `void`: `node.job.id` is
the root job id to pass to `getFlow(id, node.job.queueName)`, and `node.children` holds the child
nodes with their ids, so a flow can be tracked without setting `options.jobId` yourself. Existing
callers that ignore the result are unaffected.
