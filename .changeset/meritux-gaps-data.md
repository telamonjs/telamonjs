---
'@telamonjs/data': minor
---

`HealthModule.forRoot({ downStatus })`: the status code when a check is down (default 503). `downStatus: 200` keeps 200 for Docker/CI health checks that read only the body.
