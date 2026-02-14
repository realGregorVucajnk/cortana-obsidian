import type { Domain } from '../../core/types';

export type SourceType = 'claude-code' | 'claude-desktop';

export interface DiscoveredSession {
  id: string;
  source: SourceType;
  title: string;
  model: string;
  createdAt: number;
  lastActivityAt: number;
  cwd: string;
  userPaths: string[];
  domain: Domain;
  project: string;
  transcriptPath: string;
  subagentPaths: string[];
}
