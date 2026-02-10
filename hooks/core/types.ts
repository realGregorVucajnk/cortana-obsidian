export type Domain = 'work' | 'personal' | 'opensource';

export interface HookInput {
  session_id?: string;
  transcript_path?: string;
  hook_event_name?: string;
}

export interface SessionCaptureInput {
  provider: 'claude' | 'codex';
  sessionId: string;
  transcriptPath: string;
  cwd: string;
}

export interface LearningCaptureInput {
  provider: 'claude' | 'codex';
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
}

export interface LearningNotePayload {
  title: string;
  insight: string;
  domain: Domain;
  project: string;
  timestamp: string;
}
