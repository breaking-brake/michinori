import type { MiddlewareHandler } from "hono";
import { logger } from "../utils/logger.js";
import { getUsage, incrementUsage } from "../services/quotaStore.js";
import { env } from "../config/env.js";

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

    const used = await getUsage();

    if (used >= limit) {
      const retryAfter = getSecondsUntilJstMidnight();
      logger.warn("dailyQuota:exceeded", { used, limit });
      c.header("Retry-After", String(retryAfter));
      c.header("X-Quota-Limit", String(limit));
      c.header("X-Quota-Remaining", "0");
      return c.json({
        error: "本日の利用上限に達しました（リセット: 0:00 JST）",
        code: "DAILY_QUOTA_EXCEEDED",
        quotaLimit: limit,
        quotaUsed: used,
      }, 429);
    }

    await next();

    const newCount = await incrementUsage();
    c.header("X-Quota-Limit", String(limit));
    c.header("X-Quota-Remaining", String(Math.max(0, limit - newCount)));
  };
}

export async function getQuotaInfo(limit: number) {
  if (isDev()) {
    return { limit: -1, used: 0, remaining: -1, isAdmin: true, resetsAt: null };
  }
  const used = await getUsage();
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    isAdmin: false,
    resetsAt: "00:00 JST",
  };
}
