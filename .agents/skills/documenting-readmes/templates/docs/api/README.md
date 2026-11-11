# HTTP API reference

Every route the {{PROJECT_NAME}} server answers, with its input and output. Skip this file if the site has no API of its own.

<!-- kit: one row per route found in the router or the api folder. Cite the file that defines it. -->

## Routes

| Method | Path | Auth | What it does | Defined in |
| --- | --- | --- | --- | --- |
| `{{GET}}` | `{{/api/...}}` | {{NONE_OR_SIGNED_IN}} | {{PURPOSE}} | `{{FILE}}` |

## Try it

```bash
curl -s {{LIVE_URL}}api/{{ROUTE}}
```

## Errors

| Status | When |
| --- | --- |
| 400 | {{WHEN}} |
| 401 | {{WHEN}} |
