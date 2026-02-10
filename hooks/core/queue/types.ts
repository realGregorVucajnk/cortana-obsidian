import type { SessionSummaryRequest } from '../types';

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
}

export interface EnrichmentJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
  attempts: number;
  retryPolicy: RetryPolicy;
  payload: SessionSummaryRequest;
  outputSessionPath: string;
}

export interface JobResult {
  id: string;
  status: JobStatus;
  error?: string;
}
