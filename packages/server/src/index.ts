import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { geoBlock } from "./middleware/geoBlock.js";
import { dailyQuota } from "./middleware/dailyQuota.js";
import { analyze } from "./routes/analyze.js";
import { chat } from "./routes/chat.js";
import { createQuotaRoute } from "./routes/quota.js";

const app = new Hono();

app.use("*", cors({
  exposeHeaders: ["X-Quota-Limit", "X-Quota-Remaining"],
}));

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.use("*", geoBlock(env.GEO_BLOCK_ENABLED));

app.route("/quota", createQuotaRoute(env.DAILY_QUOTA_LIMIT));

app.use("/analyze/*", rateLimit({ perIp: env.RATE_LIMIT_PER_IP, global: env.RATE_LIMIT_GLOBAL }));
app.use("/analyze/*", dailyQuota(env.DAILY_QUOTA_LIMIT));
app.use("/chat/*", dailyQuota(env.DAILY_QUOTA_LIMIT));

app.route("/analyze", analyze);
app.route("/chat", chat);

app.use("/*", serveStatic({ root: "../../public" }));
app.get("/*", serveStatic({ root: "../../public", path: "index.html" }));

logger.info("server:start", { port: env.PORT });

serve({ fetch: app.fetch, port: env.PORT });
