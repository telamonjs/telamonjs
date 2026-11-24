---
'@telamonjs/logger': patch
---

`audit()` entries are no longer dropped by the level filter. They are compliance records
(`AuditContext` carries `changes`, `reason`, `compliance: ['GDPR', 'LGPD']`), yet they were logged at
INFO, so a production `LOG_LEVEL=warn` silently discarded the whole audit trail. They are now always
written (still at INFO severity, tagged `level: 'audit'`); only a disabled logger (`enabled: false`,
`createTestLogger()`) drops them. Documented in the README and on the logger docs page.
