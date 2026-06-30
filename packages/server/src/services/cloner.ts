import { execFile } from "node:child_process";
import { rm, mkdtemp, readdir, lstat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { logger } from "../utils/logger.js";

const exec = promisify(execFile);

const CLONE_TIMEOUT_MS = 60_000;
// Reject repos whose working tree exceeds this, to bound disk/memory usage and
// prevent a single huge repo from exhausting the instance (DoS).
const MAX_REPO_BYTES = 200 * 1024 * 1024; // 200 MB

/** Sum the on-disk size of a directory tree without following symlinks. */
async function dirSize(dir: string, budget: number): Promise<number> {
  let total = 0;
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        total += (await lstat(full)).size;
        if (total > budget) return total; // early exit once over budget
      }
    }
  }
  return total;
}

export interface CloneResult {
  dir: string;
  cleanup: () => Promise<void>;
}

export async function cloneRepo(repoUrl: string): Promise<CloneResult> {
  const dir = await mkdtemp(join(tmpdir(), "michinori-"));
  logger.info("clone:start", { repoUrl, dir });

  try {
    await exec("git", ["clone", "--depth", "1", "--single-branch", repoUrl, dir], {
      timeout: CLONE_TIMEOUT_MS,
    });
  } catch (err) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    logger.error("clone:failed", { repoUrl, error: message });
    throw new Error(`Failed to clone ${repoUrl}: ${message}`);
  }

  const size = await dirSize(dir, MAX_REPO_BYTES);
  if (size > MAX_REPO_BYTES) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    logger.error("clone:too_large", { repoUrl, sizeBytes: size, limitBytes: MAX_REPO_BYTES });
    throw new Error(`Repository too large: exceeds ${MAX_REPO_BYTES} bytes`);
  }

  logger.info("clone:done", { repoUrl, dir });

  return {
    dir,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      logger.info("clone:cleanup", { dir });
    },
  };
}
