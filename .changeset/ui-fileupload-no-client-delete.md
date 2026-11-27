---
'@telamonjs/ui': patch
---

`FileUpload` no longer sends `DELETE <uploadEndpoint>?key=…` for the old file when a file is replaced (`maxFiles: 1`). That request went out before the form was saved, so cancelling the edit, or a failed upload, left the record pointing at a deleted file. The old object now stays: delete it on the server when the record saves with the new URL.
