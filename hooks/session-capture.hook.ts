#!/usr/bin/env bun
/**
 * Backward-compatible Claude wrapper.
 *
 * Existing Claude setups typically call:
 *   bun ~/.claude/hooks/session-capture.hook.ts
 *
 * This wrapper keeps that contract and delegates to the Claude provider adapter.
 */

import { runClaudeSessionEndHook } from './providers/claude/session-end.hook';

const code = await runClaudeSessionEndHook();
process.exit(code);
