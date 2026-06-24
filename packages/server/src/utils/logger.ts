type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    severity: level.toUpperCase(),
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  const out = level === "error" ? console.error : console.log;
  out(JSON.stringify(entry));
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
