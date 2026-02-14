import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import { ensureDir } from '../../core/io';
import { getISOTimestamp } from '../../core/common';

const TAG = '[watermark]';
const WATERMARK_FILE = 'watermark.json';
const MAX_PROCESSED_IDS = 200;

export interface WatermarkState {
  version: 1;
  lastRunAt: string;
  sources: {
    claudeCode: { lastProcessedTimestamp: number; processedSessionIds: string[] };
    claudeDesktop: { lastProcessedTimestamp: number; processedSessionIds: string[] };
  };
  stats: {
    totalSessionsProcessed: number;
    totalNotesCreated: number;
    totalKnowledgeExtracted: number;
  };
}

export function getDefaultWatermark(backfillDays: number): WatermarkState {
  const cutoff = Date.now() - backfillDays * 86_400_000;
  return {
    version: 1,
    lastRunAt: getISOTimestamp(),
    sources: {
      claudeCode: { lastProcessedTimestamp: cutoff, processedSessionIds: [] },
      claudeDesktop: { lastProcessedTimestamp: cutoff, processedSessionIds: [] },
    },
    stats: {
      totalSessionsProcessed: 0,
      totalNotesCreated: 0,
      totalKnowledgeExtracted: 0,
    },
  };
}

export function readWatermark(stateDir: string): WatermarkState | null {
  const filePath = join(stateDir, WATERMARK_FILE);
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as WatermarkState;
    if (parsed.version !== 1 || !parsed.sources) {
      console.error(`${TAG} invalid watermark schema, ignoring`);
      return null;
    }
    return parsed;
  } catch (err) {
    console.error(`${TAG} failed to read watermark:`, err);
    return null;
  }
}

export function writeWatermark(stateDir: string, state: WatermarkState): void {
  ensureDir(stateDir);
  const filePath = join(stateDir, WATERMARK_FILE);
  const tmpPath = filePath + '.tmp';

  state.lastRunAt = getISOTimestamp();

  try {
    writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`${TAG} failed to write watermark:`, err);
    throw err;
  }
}

export function updateWatermarkForSession(
  state: WatermarkState,
  source: 'claudeCode' | 'claudeDesktop',
  sessionId: string,
  timestamp: number,
): WatermarkState {
  const sourceState = state.sources[source];

  // Add session ID, trim to rolling window
  sourceState.processedSessionIds.push(sessionId);
  if (sourceState.processedSessionIds.length > MAX_PROCESSED_IDS) {
    sourceState.processedSessionIds = sourceState.processedSessionIds.slice(-MAX_PROCESSED_IDS);
  }

  // Advance timestamp high-water mark
  if (timestamp > sourceState.lastProcessedTimestamp) {
    sourceState.lastProcessedTimestamp = timestamp;
  }

  state.stats.totalSessionsProcessed++;
  return state;
}
