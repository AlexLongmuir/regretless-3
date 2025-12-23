/**
 * Vercel-compatible logging utility for Edge Runtime
 * 
 * Edge Runtime logging has specific requirements:
 * 1. Edge logs appear in "Function Logs" in the dashboard (not "Deployment Logs")
 * 2. console.error() is the most reliable method for Edge Runtime
 * 3. console.log() may not always appear in Edge Runtime logs
 * 4. Logs are buffered and may not appear immediately
 * 5. Very long logs may be truncated
 * 6. Edge Runtime uses Web APIs, not Node.js APIs
 * 
 * IMPORTANT: In Vercel dashboard, filter logs by "Edge" runtime type to see Edge logs.
 * This utility ensures logs are properly formatted and visible in Vercel Edge Runtime.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

/**
 * Logs a message with context, ensuring it appears in Vercel logs
 */
export function log(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  // Use console.error for errors and warnings to ensure they appear in Vercel
  // Vercel's log viewer prioritizes error-level logs
  if (level === 'error') {
    if (context) {
      console.error(`${prefix} ${message}`, JSON.stringify(context, null, 2));
    } else {
      console.error(`${prefix} ${message}`);
    }
  } else if (level === 'warn') {
    if (context) {
      console.error(`${prefix} ${message}`, JSON.stringify(context, null, 2));
    } else {
      console.error(`${prefix} ${message}`);
    }
  } else {
    // For info/debug in Edge Runtime, always use console.error
    // Edge Runtime doesn't reliably show console.log() in Vercel logs
    const logMessage = context 
      ? `${prefix} ${message} ${JSON.stringify(context, null, 2)}`
      : `${prefix} ${message}`;
    
    // In Edge Runtime, console.log may not appear, so use console.error for all logs
    // This ensures visibility in Vercel Edge Function logs
    console.error(logMessage);
    
    // Also log to console.log for local development (works in dev mode)
    if (process.env.NODE_ENV !== 'production') {
      console.log(logMessage);
    }
  }
}

/**
 * Logs an info-level message
 */
export function logInfo(message: string, context?: LogContext) {
  log('info', message, context);
}

/**
 * Logs a warning-level message
 */
export function logWarn(message: string, context?: LogContext) {
  log('warn', message, context);
}

/**
 * Logs an error-level message
 */
export function logError(message: string, error?: Error | unknown, context?: LogContext) {
  const errorContext: LogContext = {
    ...context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : String(error),
  };
  log('error', message, errorContext);
}

/**
 * Logs a debug-level message (only in development)
 */
export function logDebug(message: string, context?: LogContext) {
  if (process.env.NODE_ENV !== 'production') {
    log('debug', message, context);
  }
}

/**
 * Logs API request/response for debugging
 */
export function logRequest(
  method: string,
  path: string,
  statusCode?: number,
  durationMs?: number,
  context?: LogContext
) {
  const requestContext: LogContext = {
    method,
    path,
    ...(statusCode !== undefined && { statusCode }),
    ...(durationMs !== undefined && { durationMs }),
    ...context,
  };
  
  const message = statusCode 
    ? `API ${method} ${path} - ${statusCode}${durationMs ? ` (${durationMs}ms)` : ''}`
    : `API ${method} ${path}`;
  
  logInfo(message, requestContext);
}

