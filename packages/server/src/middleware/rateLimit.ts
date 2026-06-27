import type { MiddlewareHandler } from "hono";
import { logger } from "../utils/logger.js";

const WINDOW_MS = 60_000;

interface RateLimitConfig {
  perIp: number;
  global: number;
}

const ipRequests = new Map<string, number[]>();
let globalRequests: number[] = [];

function pruneOld(timestamps: number[], now: number): number[] {
  const cutoff = now - WINDOW_MS;
  const idx = timestamps.findIndex((t) => t > cutoff);
  return idx === -1 ? [] : timestamps.slice(idx);
}

function getClientIp(req: Request, headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function rateLimit(config: RateLimitConfig): MiddlewareHandler {
  return async (c, next) => {
    const now = Date.now();
    const ip = getClientIp(c.req.raw, c.req.raw.headers);

    globalRequests = pruneOld(globalRequests, now);
    if (globalRequests.length >= config.global) {
      logger.warn("rateLimit:global", { count: globalRequests.length });
      c.header("Retry-After", "60");
      return c.json({ error: "Too many requests (global limit)", code: "RATE_LIMITED" }, 429);
    }

    const ipHistory = pruneOld(ipRequests.get(ip) ?? [], now);
    if (ipHistory.length >= config.perIp) {
      logger.warn("rateLimit:ip", { ip, count: ipHistory.length });
      c.header("Retry-After", "60");
      return c.json({ error: "Too many requests", code: "RATE_LIMITED" }, 429);
    }

    globalRequests.push(now);
    ipHistory.push(now);
    ipRequests.set(ip, ipHistory);

    await next();
  };
}
