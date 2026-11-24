---
'@telamonjs/queue': minor
---

Job contracts take an optional short `label`. The HTTP handlers serve `displayName` as `label`, else `description`, else the job name, so apps that set no label see no change.
