# CLAUDE.md — {{scope}}/jobs

Worker and scheduler (BullMQ via `@telamonjs/queue`). No port of
its own — only consumes/schedules Redis queues.

```
src/queue/client.ts   # QueueManager (BullMQ + Redis), prefix "{{projectSlug}}"
src/jobs/*.job.ts     # one class per queue — keep the logic itself in
                      # {{scope}}/shared once there is more than a toy job
src/registry.ts       # register() for every Job
src/worker.ts         # creates the workers
src/scheduler.ts      # a separate process for repeatables (commented example)
```

`tsx --env-file=../../.env` loads the root `.env` explicitly on every
script — this app has no framework doing it automatically.

## Commands

```bash
pnpm --filter {{scope}}/jobs worker
pnpm --filter {{scope}}/jobs scheduler
```
