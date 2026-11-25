---
'@telamonjs/data': patch
---

Fix: `HealthModule` crashed a Nest 10 app at boot when it used `@nestjs/swagger` 7 ("Cannot read properties of undefined (reading '0')"): the published controller carried no route param types, which Swagger reads. They are now declared explicitly, regardless of how the package or the app is compiled.
