# Contributing

Thanks for your interest in contributing to the Obsidian AI Knowledge Vault!

## Reporting Bugs

Open an issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:

- Which provider you're using (Claude Code or Codex)
- Your enrichment mode (`inline`, `async`, or `hybrid`)
- Steps to reproduce the issue
- Expected vs. actual behavior

## Suggesting Features

Open an issue using the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml). Describe the problem you're solving and your proposed approach.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Obsidian](https://obsidian.md) with Dataview and Templater plugins
- An OpenAI API key or local Ollama installation

### Getting Started

1. Fork and clone the repo
2. Open the cloned folder as an Obsidian vault
3. Install dependencies:
   ```bash
   cd hooks && bun install
   ```
4. Set up environment variables (see [`START_HERE.md`](./START_HERE.md))
5. Run a test session to verify the hook pipeline works

### Running Tests

```bash
cd hooks && bun test
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all new/modified notes have valid frontmatter per the schema in [`CLAUDE.md`](./CLAUDE.md)
4. Update documentation if your change affects user-facing behavior
5. Open a PR using the [pull request template](.github/PULL_REQUEST_TEMPLATE.md)

### PR Checklist

- [ ] Frontmatter follows the schema in `CLAUDE.md`
- [ ] Tags use only the controlled vocabulary
- [ ] No personal data (usernames, project names, API keys)
- [ ] Documentation updated for user-facing changes
- [ ] Tests pass (`bun test` in `hooks/`)

## Documentation Contributions

See [`docs/contributing-docs.md`](./docs/contributing-docs.md) for documentation guidelines and conventions.

## Code of Conduct

Be respectful and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
