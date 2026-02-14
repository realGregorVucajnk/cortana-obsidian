# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Sanitized repo for public template use
- Added example notes for sessions, decisions, patterns, and learnings
- Added CONTRIBUTING.md, issue templates, PR template
- Improved README, START_HERE, and HOOKS documentation
- Added folder README placeholders

## [2026-02-13] - Daily Knowledge Extraction

- Added Method D daily extraction pipeline
- Cron-triggered batch processing of recent sessions
- Configurable extraction window and confidence thresholds

## [2026-02-10] - Stability Fixes

- Fixed significance filter rejecting all sessions (was checking empty ISC.json criteria)
- Fixed race condition where SessionSummary deleted `current-work.json` before session capture read it
- Added `detectProject()` to extract project name from transcript paths
- Added fallback session scan when state file is missing
- Added `enrichedAt` metadata to types and frontmatter renderer

## [2026-02-09] - Initial Hook Pipeline

- Session capture hook with Claude and Codex provider adapters
- Learning sync hook for automatic knowledge extraction
- LLM-powered session enrichment (executive summary, decisions, digest, git context)
- Auto-distillation of knowledge notes (decisions, patterns, learnings)
- Dataview dashboards for sessions, decisions, action items, weekly digest, by-project views
- Async queue/worker scaffold for scalable enrichment (Method B)
- Templater templates for manual note creation
