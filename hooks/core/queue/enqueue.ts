import { enqueueJob } from './store';
import type { SessionSummaryRequest } from '../types';

export function enqueueSessionEnrichment(vaultPath: string, request: SessionSummaryRequest, outputSessionPath: string): string {
  return enqueueJob(vaultPath, {
    payload: request,
    outputSessionPath,
    retryPolicy: {
      maxAttempts: Number(process.env.QUEUE_MAX_ATTEMPTS || 3),
      backoffMs: Number(process.env.QUEUE_BACKOFF_MS || 5000),
    },
  });
}
