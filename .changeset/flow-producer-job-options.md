---
'@telamonjs/queue': patch
---

`FlowProducer` applies the same job-option precedence as `QueueManager.add()`: manager
`defaultJobOptions` < the job class's own `options` < the flow node's `options`. Flow jobs used to
get only the node's `options`, so a job class with `attempts: 5` (or the `Job` default of 3 with
exponential backoff) ran once, without retries, when it was part of a flow. A job given by name
uses the registered class's options.
