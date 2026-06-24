import { execFile } from "node:child_process";
import { rm, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { logger } from "../utils/logger.js";

const exec = promisify(execFile);

const CLONE_TIMEOUT_MS = 60_000;

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

  logger.info("clone:done", { repoUrl, dir });

  return {
    dir,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      logger.info("clone:cleanup", { dir });
    },
  };
}
