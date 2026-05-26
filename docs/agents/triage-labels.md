# Triage Labels

Beerolog currently records issue readiness and category directly in GitHub issue bodies instead of relying on a fixed label set.

## Category roles

| Role in mattpocock/skills | GitHub representation |
| --- | --- |
| `bug` | `## Type` section set to `bug` |
| `enhancement` | `## Type` section set to `enhancement` |

## State roles

| Role in mattpocock/skills | GitHub representation | Meaning |
| --- | --- | --- |
| `needs-triage` | `## Current intended status` set to `needs-triage` | Maintainer needs to evaluate this item |
| `needs-info` | `## Current intended status` set to `needs-info` | Waiting on reporter or maintainer follow-up |
| `ready-for-agent` | `## Current intended status` set to `ready-for-agent` | Fully specified and ready for execution |
| `ready-for-human` | `## Current intended status` set to `ready-for-human` | Needs human implementation or decision-making |
| `wontfix` | `## Current intended status` set to `wontfix` | Will not be actioned |

When a skill says to apply, remove, or inspect a label, update or read the `Type` and `Current intended status` sections on the GitHub issue unless the repo later adopts a formal label taxonomy.
