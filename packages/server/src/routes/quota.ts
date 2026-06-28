import { Hono } from "hono";
import { getQuotaInfo } from "../middleware/dailyQuota.js";

export function createQuotaRoute(limit: number) {
  const quota = new Hono();

  quota.get("/", async (c) => {
    const info = await getQuotaInfo(limit);
    return c.json(info);
  });

  return quota;
}
