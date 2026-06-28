import { Hono } from "hono";
import { getQuotaInfo } from "../middleware/dailyQuota.js";

export function createQuotaRoute(limit: number) {
  const quota = new Hono();

  quota.get("/", (c) => {
    return c.json(getQuotaInfo(limit));
  });

  return quota;
}
