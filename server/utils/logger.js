const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize, errors } = format;

// ── Dev format: readable, coloured, with stack traces ──────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    stack
      ? `${ts} ${level}: ${message}\n${stack}`
      : `${ts} ${level}: ${message}`
  )
);

// ── Prod format: structured JSON for log aggregators ────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new transports.Console()],
  exitOnError: false,
});

module.exports = logger;
