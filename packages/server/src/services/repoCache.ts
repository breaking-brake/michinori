import { logger } from "../utils/logger.js";
import { cloneRepo } from "./cloner.js";
import { collectFiles, type FileEntry } from "./fileTree.js";

interface CachedRepo {
  files: FileEntry[];
  cachedAt: number;
}

const cache = new Map<string, CachedRepo>();
const TTL_MS = 30 * 60 * 1000;

export async function getRepoFiles(repoUrl: string): Promise<FileEntry[]> {
  const existing = cache.get(repoUrl);
  if (existing && Date.now() - existing.cachedAt < TTL_MS) {
    logger.info("repoCache:hit", { repoUrl });
    return existing.files;
  }

  logger.info("repoCache:miss", { repoUrl });
  const cloneResult = await cloneRepo(repoUrl);
  try {
    const files = await collectFiles(cloneResult.dir);
    cache.set(repoUrl, { files, cachedAt: Date.now() });
    return files;
  } finally {
    await cloneResult.cleanup();
  }
}

export function cacheRepoFiles(repoUrl: string, files: FileEntry[]) {
  cache.set(repoUrl, { files, cachedAt: Date.now() });
  logger.info("repoCache:stored", { repoUrl, fileCount: files.length });
}
