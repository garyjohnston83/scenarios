type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  module: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const configuredLevel: LogLevel =
  (process.env.REACT_APP_LOG_LEVEL as LogLevel) || 'info';

const logBuffer: LogEntry[] = [];
const BUFFER_FLUSH_SIZE = 10;
const BUFFER_FLUSH_INTERVAL_MS = 5000;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

function formatMessage(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
}

function flushLogs(): void {
  if (logBuffer.length === 0) return;

  const entries = logBuffer.splice(0, logBuffer.length);
  const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090';

  try {
    fetch(`${apiBase}/api/client-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    }).catch(() => {
      // Silently fail - don't want log shipping to break the app
    });
  } catch {
    // Silently fail - fetch may not be available in all environments
  }
}

// Flush periodically
setInterval(flushLogs, BUFFER_FLUSH_INTERVAL_MS);

function log(level: LogLevel, module: string, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    module,
    timestamp: new Date().toISOString(),
    context,
  };

  // Always write to browser console
  const formatted = formatMessage(entry);
  const consoleMethod = level === 'debug' ? 'log' : level;
  if (context) {
    console[consoleMethod](formatted, context);
  } else {
    console[consoleMethod](formatted);
  }

  // Buffer for backend shipping
  logBuffer.push(entry);
  if (logBuffer.length >= BUFFER_FLUSH_SIZE) {
    flushLogs();
  }
}

export function createLogger(module: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) => log('debug', module, message, context),
    info: (message: string, context?: Record<string, unknown>) => log('info', module, message, context),
    warn: (message: string, context?: Record<string, unknown>) => log('warn', module, message, context),
    error: (message: string, context?: Record<string, unknown>) => log('error', module, message, context),
  };
}

// Flush remaining logs when the page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushLogs);
}
