---
'@telamonjs/cli': patch
---

`telamonjs db dump` / `db restore` report failures correctly. A failing `pg_dump` used to print
"Dump created successfully" and leave an empty `.sql.gz` that `db restore` then offered as a valid
backup; it now fails, removes the partial file and says so. In `db restore`, a failed connection
or a corrupt dump now prints its error message (under `set -e` the checks never ran), and a failed
`prisma migrate deploy` after a successful restore only warns, as documented, instead of making the
whole restore exit as failed.
