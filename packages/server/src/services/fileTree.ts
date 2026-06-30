import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";
import { logger } from "../utils/logger.js";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "vendor",
  "__pycache__",
  ".venv",
  "target",
  "coverage",
  ".terraform",
]);

const IGNORE_FILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "Cargo.lock",
  "go.sum",
  "poetry.lock",
  "Pipfile.lock",
  "composer.lock",
]);

const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".avif",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".br",
  ".wasm", ".so", ".dylib", ".dll", ".exe",
  ".pdf", ".mp4", ".mp3", ".wav",
  ".db", ".sqlite", ".sqlite3",
]);

const SOURCE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyi",
  ".go",
  ".rs",
  ".java", ".kt", ".kts",
  ".rb",
  ".php",
  ".c", ".cpp", ".cc", ".h", ".hpp",
  ".cs",
  ".swift",
  ".scala",
  ".lua",
  ".sh", ".bash", ".zsh",
  ".sql",
  ".graphql", ".gql",
  ".proto",
]);

const HIGH_SIGNAL_FILES = new Set([
  "README.md",
  "README",
  "package.json",
  "tsconfig.json",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "setup.py",
  "build.gradle",
  "build.gradle.kts",
  "pom.xml",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".github/workflows",
]);

const MAX_FILE_SIZE = 100_000;
const CHAR_BUDGET = 80_000;
const TRUNCATE_LINES = 100;

export interface FileEntry {
  path: string;
  content: string;
  sizeBytes: number;
  isHighSignal: boolean;
}

export async function collectFiles(repoDir: string): Promise<FileEntry[]> {
  const files: { path: string; sizeBytes: number; isHighSignal: boolean }[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".github") continue;
      // Skip symlinks: a malicious repo could symlink to files outside the
      // clone (e.g. /etc/passwd, mounted secrets) and stat()/readFile() would
      // follow the link, leaking server-side files into the prompt/cache.
      if (entry.isSymbolicLink()) continue;
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        await walk(fullPath);
      } else {
        const relPath = relative(repoDir, fullPath);
        const ext = extname(entry.name).toLowerCase();
        const name = basename(entry.name);

        if (IGNORE_FILES.has(name)) continue;
        if (BINARY_EXTS.has(ext)) continue;

        const info = await stat(fullPath);
        if (info.size > MAX_FILE_SIZE) continue;
        if (info.size === 0) continue;

        const isHighSignal = HIGH_SIGNAL_FILES.has(name) || relPath.startsWith(".github/workflows");
        const isSource = SOURCE_EXTS.has(ext);

        if (isHighSignal || isSource || ext === ".md" || ext === ".json" || ext === ".yaml" || ext === ".yml" || ext === ".toml") {
          files.push({ path: relPath, sizeBytes: info.size, isHighSignal });
        }
      }
    }
  }

  await walk(repoDir);

  files.sort((a, b) => {
    if (a.isHighSignal !== b.isHighSignal) return a.isHighSignal ? -1 : 1;
    const aDepth = a.path.split("/").length;
    const bDepth = b.path.split("/").length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.sizeBytes - b.sizeBytes;
  });

  const result: FileEntry[] = [];
  let totalChars = 0;

  for (const file of files) {
    if (totalChars >= CHAR_BUDGET) break;

    try {
      let content = await readFile(join(repoDir, file.path), "utf-8");

      if (content.length > 5000) {
        const lines = content.split("\n");
        const head = lines.slice(0, TRUNCATE_LINES).join("\n");
        const tail = lines.slice(-20).join("\n");
        content = `${head}\n\n... [truncated ${lines.length - TRUNCATE_LINES - 20} lines] ...\n\n${tail}`;
      }

      if (totalChars + content.length > CHAR_BUDGET && !file.isHighSignal) break;

      result.push({
        path: file.path,
        content,
        sizeBytes: file.sizeBytes,
        isHighSignal: file.isHighSignal,
      });
      totalChars += content.length;
    } catch {
      continue;
    }
  }

  logger.info("fileTree:collected", {
    totalFiles: files.length,
    selectedFiles: result.length,
    totalChars,
  });

  return result;
}

export function buildFileTreeString(files: FileEntry[]): string {
  return files.map((f) => f.path).join("\n");
}

export function buildCodeContext(files: FileEntry[]): string {
  return files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");
}
