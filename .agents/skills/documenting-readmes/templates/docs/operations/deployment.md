# Deployment and operations

Where {{PROJECT_NAME}} runs, how it gets there, and where to look when it breaks.

## Hosted site

The live site is at [{{LIVE_DOMAIN}}]({{LIVE_URL}}). {{HOST_AND_HOW_IT_DEPLOYS, or "The hosting setup is not recorded in the repository."}}

## Environments

| Environment | URL | Deploys from | Settings |
| --- | --- | --- | --- |
| Production | {{LIVE_URL}} | `{{BRANCH}}` | {{HOST_SETTINGS_PAGE}} |
| Preview | {{URL_PATTERN}} | {{PULL_REQUESTS}} | {{SAME_OR_DIFFERENT}} |

## Domain

{{DNS_RECORDS_AND_WHERE_THE_DOMAIN_IS_REGISTERED, if recorded}}

## Logs

{{WHERE_TO_FIND_BUILD_AND_RUNTIME_LOGS}}
