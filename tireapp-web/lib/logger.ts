/**
 * Structured logging utility for API routes
 * Outputs JSON-formatted logs for production monitoring tools
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  route?: string
  method?: string
  statusCode?: number
  duration?: number
  error?: string
  stack?: string
  [key: string]: unknown
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry)
  }
  // Human-readable in development
  const parts = [`[${entry.level.toUpperCase()}]`, entry.message]
  if (entry.route) parts.push(`${entry.method || 'GET'} ${entry.route}`)
  if (entry.duration !== undefined) parts.push(`${entry.duration}ms`)
  if (entry.statusCode) parts.push(`-> ${entry.statusCode}`)
  if (entry.error) parts.push(`| ${entry.error}`)
  return parts.join(' ')
}

export const logger = {
  info(message: string, meta?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }
    console.log(formatLog(entry))
  },

  warn(message: string, meta?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }
    console.warn(formatLog(entry))
  },

  error(message: string, err?: unknown, meta?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }
    if (err instanceof Error) {
      entry.error = err.message
      entry.stack = err.stack
    } else if (err) {
      entry.error = String(err)
    }
    console.error(formatLog(entry))
  },

  /** Log an API request completion */
  api(route: string, method: string, statusCode: number, duration: number, meta?: Record<string, unknown>) {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const entry: LogEntry = {
      level,
      message: 'api_request',
      timestamp: new Date().toISOString(),
      route,
      method,
      statusCode,
      duration,
      ...meta,
    }
    if (level === 'error') {
      console.error(formatLog(entry))
    } else if (level === 'warn') {
      console.warn(formatLog(entry))
    } else {
      console.log(formatLog(entry))
    }
  },
}
