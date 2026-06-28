import type { MiddlewareHandler } from "hono";
import { Storage } from "@google-cloud/storage";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

const BUCKET_NAME = env.QUOTA_BUCKET ?? "";
const OBJECT_NAME = "daily-quota.json";

interface QuotaData {
  dateKey: string;
  count: number;
}

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) storage = new Storage();
  return storage;
}

function getJstDateKey(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

let cached: QuotaData | null = null;

async function readQuota(): Promise<QuotaData> {
  const dateKey = getJstDateKey();

  if (cached && cached.dateKey === dateKey) return cached;

  if (!BUCKET_NAME) {
    cached = { dateKey, count: 0 };
    return cached;
  }

  try {
    const [content] = await getStorage().bucket(BUCKET_NAME).file(OBJECT_NAME).download();
    const data = JSON.parse(content.toString()) as QuotaData;
    if (data.dateKey === dateKey) {
      cached = data;
      return cached;
    }
  } catch {
    // file doesn't exist or parse error — start fresh
  }

  cached = { dateKey, count: 0 };
  return cached;
}

async function writeQuota(data: QuotaData): Promise<void> {
  cached = data;
  if (!BUCKET_NAME) return;

  try {
    await getStorage()
      .bucket(BUCKET_NAME)
      .file(OBJECT_NAME)
      .save(JSON.stringify(data), { contentType: "application/json" });
  } catch (err) {
    logger.error("dailyQuota:writeFailed", { error: String(err) });
  }
}

function isDev(): boolean {
  return env.NODE_ENV === "development";
}

function getSecondsUntilJstMidnight(): number {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(jst);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.ceil((tomorrow.getTime() - jst.getTime()) / 1000);
}

export function dailyQuota(limit: number): MiddlewareHandler {
  return async (c, next) => {
    if (isDev()) {
      c.header("X-Quota-Limit", "unlimited");
      c.header("X-Quota-Remaining", "unlimited");
      await next();
      return;
    }

    const quota = await readQuota();

    if (quota.count >= limit) {
      const retryAfter = getSecondsUntilJstMidnight();
      logger.warn("dailyQuota:exceeded", { used: quota.count, limit });
      c.header("Retry-After", String(retryAfter));
      c.header("X-Quota-Limit", String(limit));
      c.header("X-Quota-Remaining", "0");
      return c.json({
        error: "本日の利用上限に達しました（リセット: 0:00 JST）",
        code: "DAILY_QUOTA_EXCEEDED",
        quotaLimit: limit,
        quotaUsed: quota.count,
      }, 429);
    }

    await next();

    quota.count++;
    await writeQuota(quota);
    c.header("X-Quota-Limit", String(limit));
    c.header("X-Quota-Remaining", String(Math.max(0, limit - quota.count)));
  };
}

export function getQuotaInfo(limit: number) {
  if (isDev()) {
    return { limit: -1, used: 0, remaining: -1, isAdmin: true, resetsAt: null };
  }
  const quota = cached ?? { dateKey: getJstDateKey(), count: 0 };
  return {
    limit,
    used: quota.count,
    remaining: Math.max(0, limit - quota.count),
    isAdmin: false,
    resetsAt: "00:00 JST",
  };
}
