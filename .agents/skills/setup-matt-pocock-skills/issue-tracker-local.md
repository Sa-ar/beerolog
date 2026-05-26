# Issue tracker: Local Markdown

Beerolog tracks planning work in local markdown files rather than GitHub Issues.

## Conventions

- PRDs live in `docs/prds/<feature-slug>.md`
- Implementation slices live in `docs/issues/<feature-slug>/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded in a `Status:` line near the top of the file
- Category is recorded in a `Type:` line when the workflow needs bug vs enhancement classification
- Notes or follow-up discussion can be appended under a `## Notes` or `## Comments` heading

## When a skill says "publish to the issue tracker"

- For PRD creation, write a markdown file under `docs/prds/`
- For issue slicing, write markdown files under `docs/issues/<feature-slug>/`
- For triage updates, edit the existing local markdown artifact in place rather than opening a remote issue

## When a skill says "fetch the relevant ticket"

Read the referenced markdown file directly. The user will normally pass a file path or feature slug rather than a remote issue number.
