---
date: 2026-02-10
type: pattern
domain: personal
status: active
tags:
  - pattern
  - planning
summary: "Layer documentation by audience depth: Quick Start, How It Works, Reference, Expert"
project: "Cortana Obsidian"
---

# Progressive Disclosure Documentation

## Problem

A project has rich technical documentation, but newcomers bounce because the first thing they see is architecture diagrams and implementation details. Experts, meanwhile, can't find the deep reference material because it's buried in getting-started prose.

## Solution

Layer documentation in 4 tiers, each targeting a different reader and linking forward to the next layer for those who want to go deeper.

## The 4 Layers

| Layer | File(s) | Audience | Answers |
|-------|---------|----------|---------|
| **1. Quick Start** | `START_HERE.md` | First-time user | "What is this? How do I get it running?" |
| **2. How It Works** | `README.md`, `docs/what-gets-captured.md` | User who's set up | "What does it do? What's the data flow?" |
| **3. Reference** | `HOOKS.md`, `HOOKS.claude.md`, `HOOKS.codex.md` | Developer modifying the system | "What are all the config options? What's the API?" |
| **4. Expert** | `docs/session-intelligence/architecture.md`, `docs/session-intelligence/runbook.md` | Contributor to the internals | "How does enrichment work? How do I debug the pipeline?" |

## Key Principles

1. **Each layer is self-contained** — You can read Layer 1 and get value without ever touching Layers 2-4
2. **Forward links only** — Layer 1 links to Layer 2, not the reverse. Don't overwhelm newcomers with "see also" links to expert docs.
3. **5-minute rule** — Layer 1 should get someone from clone to working in under 5 minutes
4. **Examples over explanations** — Each layer includes at least one concrete example (setup command, sample output, code snippet)

## Applied Example (cortana-obsidian)

```
Layer 1: START_HERE.md
  "Clone this repo, install these 4 Obsidian plugins, open the vault."
  → Link to README.md for "How it works"

Layer 2: README.md + docs/what-gets-captured.md
  "Sessions are captured by hooks, enriched with AI, stored as Obsidian notes."
  → Link to HOOKS.md for "Full hook reference"

Layer 3: HOOKS.md / HOOKS.claude.md / HOOKS.codex.md
  "SessionEnd hook reads transcript, calls render(), writes to Sessions/"
  → Link to docs/session-intelligence/ for "Enrichment internals"

Layer 4: docs/session-intelligence/architecture.md
  "Method A extracts context via LLM, Method B queues for async processing..."
```

## When to Use

- Open-source projects with diverse audiences (end users, integrators, contributors)
- Internal tools where the setup person is different from the power user
- Any system where documentation has grown organically and needs restructuring

## Related Notes

- [[2026-02-10_newcomer-documentation]] — Session where this pattern was applied
