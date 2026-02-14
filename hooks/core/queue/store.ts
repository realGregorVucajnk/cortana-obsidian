import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getISOTimestamp } from '../common';
import { slugify } from '../common';
import type { EnrichmentJob, JobResult } from './types';

export function getQueueDirs(vaultPath: string): { base: string; pending: string; processing: string; done: string; failed: string } {
  const base = join(vaultPath, '.hooks-queue');
  return {
    base,
    pending: join(base, 'pending'),
    processing: join(base, 'processing'),
    done: join(base, 'done'),
    failed: join(base, 'failed'),
  };
}

export function ensureQueueDirs(vaultPath: string): void {
  const dirs = getQueueDirs(vaultPath);
  for (const path of [dirs.base, dirs.pending, dirs.processing, dirs.done, dirs.failed]) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
  }
}

export function enqueueJob(vaultPath: string, job: Omit<EnrichmentJob, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'attempts'>): string {
  ensureQueueDirs(vaultPath);
  const dirs = getQueueDirs(vaultPath);

  const id = `${Date.now()}-${slugify(job.payload.title, 24) || 'job'}`;
  const now = getISOTimestamp();
  const fullJob: EnrichmentJob = {
    ...job,
    id,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    attempts: 0,
  };

  writeFileSync(join(dirs.pending, `${id}.json`), JSON.stringify(fullJob, null, 2), 'utf-8');
  return id;
}

export function claimNextJob(vaultPath: string): EnrichmentJob | null {
  ensureQueueDirs(vaultPath);
  const dirs = getQueueDirs(vaultPath);
  const files = readdirSync(dirs.pending).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) return null;

  const source = join(dirs.pending, files[0]);
  const dest = join(dirs.processing, files[0]);
  renameSync(source, dest);

  const job = JSON.parse(readFileSync(dest, 'utf-8')) as EnrichmentJob;
  job.status = 'processing';
  job.attempts += 1;
  job.updatedAt = getISOTimestamp();
  writeFileSync(dest, JSON.stringify(job, null, 2), 'utf-8');
  return job;
}

export function finalizeJob(vaultPath: string, job: EnrichmentJob, result: JobResult): void {
  const dirs = getQueueDirs(vaultPath);
  const current = join(dirs.processing, `${job.id}.json`);

  if (result.status === 'done') {
    job.status = 'done';
    job.updatedAt = getISOTimestamp();
    writeFileSync(join(dirs.done, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf-8');
    if (existsSync(current)) unlinkSync(current);
    return;
  }

  if (job.attempts < job.retryPolicy.maxAttempts) {
    job.status = 'pending';
    job.updatedAt = getISOTimestamp();
    writeFileSync(join(dirs.pending, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf-8');
    if (existsSync(current)) unlinkSync(current);
    return;
  }

  job.status = 'failed';
  job.updatedAt = getISOTimestamp();
  writeFileSync(
    join(dirs.failed, `${job.id}.json`),
    JSON.stringify({ ...job, error: result.error || 'unknown' }, null, 2),
    'utf-8',
  );
  if (existsSync(current)) unlinkSync(current);
}
