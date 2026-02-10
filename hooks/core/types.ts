export type Domain = 'work' | 'personal' | 'opensource';
export type Provider = 'claude' | 'codex';
export type DistillKind = 'decision' | 'pattern' | 'learning';

export interface HookInput {
  session_id?: string;
  transcript_path?: string;
  hook_event_name?: string;
}

export interface SessionCaptureInput {
  provider: Provider;
  sessionId: string;
  transcriptPath: string;
  cwd: string;
}

export interface LearningCaptureInput {
  provider: Provider;
  sessionId: string;
  transcriptPath: string;
  cwd: string;
}

export interface CurrentWork {
  session_id: string;
  session_dir: string;
  current_task: string;
  task_count: number;
  created_at: string;
}

export interface WorkResolution {
  currentWork: CurrentWork;
  workPath: string;
  meta: Record<string, string>;
}

export interface ISCData {
  criteria: string[];
  satisfaction: { satisfied: number; total: number } | null;
}

export interface GitSnapshot {
  available: boolean;
  repoRoot: string;
  branch: string;
  headSha: string;
  workingTreeFiles: number;
  stagedFiles: number;
  changedFiles: string[];
  insertions: number;
  deletions: number;
}

export interface DistillCandidate {
  kind: DistillKind;
  title: string;
  summary: string;
  rationale: string;
  confidence: number;
}

export interface SessionEnrichment {
  executiveSummary: string[];
  keyDecisions: Array<{ decision: string; rationale: string; confidence: number }>;
  digest: string;
  recommendations: DistillCandidate[];
  git: GitSnapshot;
  summaryEngine: string;
  summaryModel: string;
  distillCount: number;
  enrichmentMode: 'inline' | 'async' | 'hybrid';
}

export interface SessionNotePayload {
  title: string;
  sessionId: string;
  domain: Domain;
  project: string;
  model: string;
  sessionType: string;
  createdAt: string;
  completedAt: string;
  summary: string;
  assistantName: string;
  isc: ISCData;
  enrichment?: SessionEnrichment;
}

export interface LearningNotePayload {
  title: string;
  insight: string;
  domain: Domain;
  project: string;
  timestamp: string;
}

export interface SessionSummaryRequest {
  provider: Provider;
  title: string;
  summary: string;
  sessionType: string;
  transcriptPath: string;
  threadContent: string;
  workPath?: string;
  domain: Domain;
  project: string;
}
