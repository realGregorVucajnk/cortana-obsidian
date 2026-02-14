#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { claimNextJob, finalizeJob, getQueueDirs } from '../core/queue/store';
import { runSessionIntelligence } from '../core/session-intelligence';

const VAULT_PATH = process.env.OBSIDIAN_VAULT || join(homedir(), 'obsidian-vault');
const SLEEP_MS = Number(process.env.QUEUE_POLL_MS || 2000);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce(): Promise<boolean> {
  const job = claimNextJob(VAULT_PATH);
  if (!job) return false;

  try {
    const enrichment = await runSessionIntelligence({
      request: job.payload,
      vaultPath: VAULT_PATH,
      sourceSessionFilename: job.outputSessionPath.split('/').pop() || 'unknown-session.md',
    });

    const dirs = getQueueDirs(VAULT_PATH);
    const resultsDir = join(dirs.base, 'results');
    if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
    writeFileSync(join(resultsDir, `${job.id}.json`), JSON.stringify(enrichment, null, 2), 'utf-8');

    finalizeJob(VAULT_PATH, job, { id: job.id, status: 'done' });
  } catch (error: any) {
    finalizeJob(VAULT_PATH, job, { id: job.id, status: 'failed', error: error?.message || 'worker error' });
  }

  return true;
}

async function main() {
  const runForever = (process.env.QUEUE_RUN_FOREVER || 'true').toLowerCase() !== 'false';

  do {
    const hadJob = await runOnce();
    if (!hadJob) {
      if (!runForever) break;
      await sleep(SLEEP_MS);
    }
  } while (runForever);
}

main().then(() => process.exit(0));
