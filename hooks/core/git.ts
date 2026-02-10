import { dirname, join } from 'path';
import { existsSync, statSync } from 'fs';
import type { GitSnapshot } from './types';

function runGit(args: string[], cwd: string): string {
  try {
    const proc = Bun.spawnSync(['git', '-C', cwd, ...args], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    if (proc.exitCode !== 0) return '';
    return proc.stdout.toString().trim();
  } catch {
    return '';
  }
}

function cleanChangedPath(input: string): string {
  return input
    .replace(/^([ MARCUD?!]{1,2})\s+/, '')
    .replace(/^([A-Z?]{1,2})\s+/, '')
    .trim();
}

function findGitRoot(startPath: string): string {
  let current = startPath;

  try {
    if (existsSync(startPath) && statSync(startPath).isFile()) {
      current = dirname(startPath);
    }
  } catch {
    current = process.cwd();
  }

  while (current && current !== dirname(current)) {
    if (existsSync(join(current, '.git'))) return current;
    current = dirname(current);
  }

  return '';
}

export function collectGitSnapshot(startPath: string): GitSnapshot {
  const repoRoot = findGitRoot(startPath) || findGitRoot(process.cwd());
  if (!repoRoot) {
    return {
      available: false,
      repoRoot: '',
      branch: '',
      headSha: '',
      workingTreeFiles: 0,
      stagedFiles: 0,
      changedFiles: [],
      insertions: 0,
      deletions: 0,
    };
  }

  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
  const headSha = runGit(['rev-parse', '--short', 'HEAD'], repoRoot);
  const porcelain = runGit(['status', '--porcelain'], repoRoot);
  const numstat = runGit(['diff', '--numstat', 'HEAD'], repoRoot);

  const changed = porcelain
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.match(/^..\\s+(.*)$/);
      const raw = match?.[1]?.trim() || line.trim();
      return cleanChangedPath(raw);
    })
    .filter(Boolean);

  const workingTreeFiles = porcelain
    .split('\n')
    .filter((line) => line.length >= 2 && line[1] !== ' ')
    .length;

  const stagedFiles = porcelain
    .split('\n')
    .filter((line) => line.length >= 2 && line[0] !== ' ')
    .length;

  let insertions = 0;
  let deletions = 0;
  for (const line of numstat.split('\n')) {
    const [ins, del] = line.split('\t');
    const i = Number(ins);
    const d = Number(del);
    if (!Number.isNaN(i)) insertions += i;
    if (!Number.isNaN(d)) deletions += d;
  }

  return {
    available: true,
    repoRoot,
    branch,
    headSha,
    workingTreeFiles,
    stagedFiles,
    changedFiles: changed.slice(0, 10).map((path) => cleanChangedPath(path)),
    insertions,
    deletions,
  };
}
