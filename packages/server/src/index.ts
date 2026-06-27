import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { geoBlock } from "./middleware/geoBlock.js";
import { analyze } from "./routes/analyze.js";

const app = new Hono();

app.use("*", cors());

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.use("*", geoBlock(env.GEO_BLOCK_ENABLED));

app.get("/", (c) =>
  c.json({ name: "michinori", status: "ok" }),
);

app.use("/analyze/*", rateLimit({ perIp: env.RATE_LIMIT_PER_IP, global: env.RATE_LIMIT_GLOBAL }));
app.route("/analyze", analyze);

logger.info("server:start", { port: env.PORT });

serve({ fetch: app.fetch, port: env.PORT });
