---
date: 2026-02-10
type: decision
domain: personal
status: active
project: "cortana-obsidian"
tags:
  - knowledge
  - decision
summary: "Use provider-delineated hook adapters for Claude and Codex"
source_sessions:
  - "[[2026-02-10_1643_fix-dashboard-typo-and-improve-docs]]"
---

# Use provider-delineated hook adapters

## Context

Cross-runtime behavior drift caused setup confusion and brittle assumptions.

## Insight

Maintain shared core logic with provider adapters so each runtime can evolve safely.

## Rationale

Reduces hidden coupling and allows runtime-specific integration without duplication.
