import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { hostname } from 'os';
import { ensureDir } from '../../core/io';
import { getISOTimestamp } from '../../core/common';

const TAG = '[lock]';
const LOCK_FILE = 'backfill-lock.json';
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

interface LockData {
  pid: number;
  acquiredAt: string;
  hostname: string;
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireLock(stateDir: string): boolean {
  ensureDir(stateDir);
  const lockPath = join(stateDir, LOCK_FILE);

  // Check existing lock
  if (existsSync(lockPath)) {
    try {
      const raw = readFileSync(lockPath, 'utf-8');
      const existing = JSON.parse(raw) as LockData;

      // Check if the holding process is still alive
      if (isProcessAlive(existing.pid)) {
        const age = Date.now() - Date.parse(existing.acquiredAt);
        if (age < STALE_THRESHOLD_MS) {
          console.error(`${TAG} lock held by PID ${existing.pid} (age: ${Math.round(age / 1000)}s)`);
          return false;
        }
        console.error(`${TAG} stale lock from PID ${existing.pid} (age: ${Math.round(age / 1000)}s), stealing`);
      } else {
        console.error(`${TAG} dead lock from PID ${existing.pid}, removing`);
      }
    } catch {
      console.error(`${TAG} corrupt lock file, removing`);
    }

    // Remove stale/dead/corrupt lock
    try {
      unlinkSync(lockPath);
    } catch {
      // ignore
    }
  }

  // Write our lock
  const lock: LockData = {
    pid: process.pid,
    acquiredAt: getISOTimestamp(),
    hostname: hostname(),
  };

  try {
    writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`${TAG} failed to acquire lock:`, err);
    return false;
  }
}

export function releaseLock(stateDir: string): void {
  const lockPath = join(stateDir, LOCK_FILE);
  try {
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
      console.error(`${TAG} lock released`);
    }
  } catch (err) {
    console.error(`${TAG} failed to release lock:`, err);
  }
}
