import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  GEMINI_API_KEY: z.string().min(1),
  RATE_LIMIT_PER_IP: z.coerce.number().default(5),
  RATE_LIMIT_GLOBAL: z.coerce.number().default(30),
  GEO_BLOCK_ENABLED: z.coerce.boolean().default(true),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
