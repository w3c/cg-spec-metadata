const COLORS = {
    reset: "\x1b[0m",
    info: "\x1b[36m",    // Cyan
    warn: "\x1b[33m",    // Yellow
    error: "\x1b[31m",   // Red
    success: "\x1b[32m", // Green
};

export const logger = {
  info: (msg) => {
    console.log(`${COLORS.info}ℹ INFO:${COLORS.reset} ${msg}`);
  },
  warn: (msg) => {
    console.warn(`${COLORS.warn}⚠ WARN:${COLORS.reset} ${msg}`);
  },
  error: (msg, err = "") => {
    console.error(`${COLORS.error}✖ ERROR:${COLORS.reset} ${msg}`);
    if (err) console.error(err);
  },
  success: (msg) => {
    console.log(`${COLORS.success}✔ SUCCESS:${COLORS.reset} ${msg}`);
  }
};