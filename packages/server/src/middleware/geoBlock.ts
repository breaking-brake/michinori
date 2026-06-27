import type { MiddlewareHandler } from "hono";
import geoip from "geoip-lite";
import { logger } from "../utils/logger.js";

const BLOCKED_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Michinori</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1e1e1e;color:#ccc;font-family:system-ui,sans-serif}
.card{text-align:center;max-width:480px;padding:40px}h1{font-size:24px;margin-bottom:16px}p{opacity:.7;line-height:1.6}</style></head>
<body><div class="card"><h1>Michinori</h1><p>This service is currently available only in Japan.</p><p>We appreciate your interest and hope to expand to other regions in the future.</p></div></body></html>`;

function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function isPrivateOrLocal(ip: string): boolean {
  return (
    ip === "unknown" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("172.") ||
    ip.startsWith("192.168.")
  );
}

export function geoBlock(enabled: boolean): MiddlewareHandler {
  return async (c, next) => {
    if (!enabled) return next();

    const ip = getClientIp(c.req.raw.headers);

    if (isPrivateOrLocal(ip)) return next();

    const geo = geoip.lookup(ip);
    const country = geo?.country ?? null;

    if (country && country !== "JP") {
      logger.warn("geoBlock:blocked", { ip, country });

      const isApi = c.req.path.startsWith("/analyze");
      if (isApi) {
        return c.json(
          { error: "This service is available only in Japan", code: "GEO_BLOCKED" as const },
          403,
        );
      }

      return c.html(BLOCKED_HTML, 403);
    }

    await next();
  };
}
