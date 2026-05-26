# Triage Labels

Beerolog's local planning workflow uses markdown metadata instead of GitHub labels.

## Category roles

| Role in mattpocock/skills | Local metadata |
| --- | --- |
| `bug` | `Type: bug` |
| `enhancement` | `Type: enhancement` |

## State roles

| Role in mattpocock/skills | Local metadata | Meaning |
| --- | --- | --- |
| `needs-triage` | `Status: needs-triage` | Maintainer needs to evaluate this item |
| `needs-info` | `Status: needs-info` | Waiting on reporter or maintainer follow-up |
| `ready-for-agent` | `Status: ready-for-agent` | Fully specified and ready for execution |
| `ready-for-human` | `Status: ready-for-human` | Needs human implementation or decision-making |
| `wontfix` | `Status: wontfix` | Will not be actioned |

When a skill says to apply, remove, or inspect a label, edit or read these metadata lines in the local markdown file instead.
