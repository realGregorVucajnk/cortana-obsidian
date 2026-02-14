#!/usr/bin/env bun
/**
 * Backward-compatible Claude wrapper.
 *
 * Existing Claude setups typically call:
 *   bun ~/.claude/hooks/learning-sync.hook.ts
 *
 * This wrapper keeps that contract and delegates to the Claude provider adapter.
 */

import { runClaudeStopHook } from './providers/claude/stop.hook';

const code = await runClaudeStopHook();
process.exit(code);
