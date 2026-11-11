# Documentation

Where to find each part of the {{PROJECT_NAME}} documentation. Everything here describes the repository as it is. Statements cite the file they come from, and anything the repository does not record is marked "Not recorded in the repository".

## Start here

| Document | What it covers |
| --- | --- |
| [README](../README.md) | What {{PROJECT_NAME}} is, the team, the live link, how it works and the quick start |
| [User guide](user-guide.md) | Each page of the site and what it does |
| [Troubleshooting](TROUBLESHOOTING.md) | Setup, build and deploy problems |

## Suggested reading order

1. [README](../README.md): what the site does and the "How it works" diagram.
2. [User guide](user-guide.md): try the live site page by page.
3. [Architecture](ARCHITECTURE.md): how the parts connect and what is not built yet.
4. [Configuration](CONFIGURATION.md): the settings each part reads.

## Reference

<!-- kit: list only the documents that exist. Delete rows for the rest. -->

| Document | What it covers |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | The parts, outside services, the main request, the data model and deployment |
| [Configuration](CONFIGURATION.md) | Every environment variable, its default and what reads it |
| [HTTP API](api/README.md) | Every route, its input and output |
| [Design](DESIGN.md) | Colours, type, spacing and motion |
| [Deployment](operations/deployment.md) | Hosting, domains, environments and logs |
| [Threat model](security/threat-model.md) | What data the site stores and sends, and how it is protected |
| [Test plan](testing/test-plan.md) | What is tested, how to run it and what CI runs |
| [Decision records](adr/README.md) | Why the main technical choices were made |
| [Glossary](glossary.md) | Terms used in the code and the docs |
