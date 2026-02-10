import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ISCData } from './types';

export function collectISC(workPath: string): ISCData {
  const tasksDir = join(workPath, 'tasks');
  const allCriteria: string[] = [];
  let totalSatisfied = 0;
  let totalCriteria = 0;

  if (!existsSync(tasksDir)) return { criteria: [], satisfaction: null };

  try {
    const taskDirs = readdirSync(tasksDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const taskDir of taskDirs) {
      const iscPath = join(tasksDir, taskDir, 'ISC.json');
      if (!existsSync(iscPath)) continue;

      try {
        const isc = JSON.parse(readFileSync(iscPath, 'utf-8'));
        if (isc.criteria?.length) allCriteria.push(...isc.criteria);
        if (isc.satisfaction) {
          totalSatisfied += isc.satisfaction.satisfied || 0;
          totalCriteria += isc.satisfaction.total || 0;
        }
      } catch {
        // Ignore malformed ISC.
      }
    }
  } catch {
    // Ignore read errors.
  }

  return {
    criteria: allCriteria,
    satisfaction: totalCriteria > 0 ? { satisfied: totalSatisfied, total: totalCriteria } : null,
  };
}

export function collectThreadContent(workPath: string): string {
  const tasksDir = join(workPath, 'tasks');
  if (!existsSync(tasksDir)) return '';

  const parts: string[] = [];
  try {
    const taskDirs = readdirSync(tasksDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const taskDir of taskDirs) {
      const threadPath = join(tasksDir, taskDir, 'THREAD.md');
      if (!existsSync(threadPath)) continue;
      try {
        parts.push(readFileSync(threadPath, 'utf-8'));
      } catch {
        // Ignore read failures.
      }
    }
  } catch {
    // Ignore read failures.
  }

  return parts.join('\n\n---\n\n');
}
