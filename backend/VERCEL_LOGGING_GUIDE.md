# Vercel Logging Guide - Edge Runtime

## ⚠️ IMPORTANT: Edge Runtime Logging

This project uses **Edge Runtime**, which has different logging behavior than Node.js functions.

## 🔧 CRITICAL: Next.js Compiler Configuration

**Next.js compiler removes console statements by default in production builds!**

Make sure your `next.config.js` includes:
```javascript
compiler: {
  removeConsole: false, // Keep all console statements for logging
}
```

Without this setting, **all console.log() and console.error() statements will be stripped from your production build**, and you won't see any logs in Vercel!

## Why logs might not be appearing

1. **Edge Runtime vs Node.js Functions**:
   - **Edge Runtime**: Uses Web APIs, logs appear in "Function Logs" but may need filtering
   - **Node.js Functions**: Uses Node.js APIs, logs appear in "Function Logs"
   
   **For Edge Runtime, you MUST use `console.error()` for all logs - `console.log()` often doesn't appear!**

2. **Log Location**: Vercel separates logs into two categories:
   - **Deployment Logs**: Build-time logs (npm install, build process)
   - **Function Logs**: Runtime logs from your API routes
   
   **You need to check "Function Logs" in the Vercel dashboard, not "Deployment Logs"**
   
   **For Edge Runtime**: In Function Logs, you may need to filter by "Edge" runtime type

2. **Log Retention**: 
   - Hobby plan: Logs retained for 1 hour
   - Pro plan: Logs retained for 1 day
   - Enterprise: Custom retention

3. **Log Drains**: By default, Vercel doesn't persist function logs. You need to:
   - Check logs in the Vercel dashboard within the retention period
   - Or set up Log Drains to send logs to a third-party service (Datadog, Logtail, etc.)

4. **Log Buffering**: Logs may be buffered and not appear immediately. This is normal.

## How to view Edge Runtime logs in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Click on the "Logs" tab (or "Function Logs" in some views)
4. **IMPORTANT for Edge Runtime**: 
   - Look for a filter option to show "Edge" runtime type
   - Or filter by your function name (Edge functions are listed separately)
5. Select a specific deployment or use "Real-time Logs" for live monitoring
6. **Use console.error() only**: Edge Runtime doesn't reliably show console.log()

### Alternative: Vercel CLI for Edge Logs

```bash
# View real-time Edge function logs
vercel logs --follow

# View logs for a specific function
vercel logs --follow /api/dreams/celebrities/generate
```

## Using the logging utility

The `lib/logger.ts` utility ensures logs are properly formatted and visible:

```typescript
import { logInfo, logError, logRequest } from '@/lib/logger';

// Info logs
logInfo('Request received', { userId: '123' });

// Error logs (most reliable in Vercel)
logError('Failed to process request', error, { userId: '123' });

// Request logs
logRequest('POST', '/api/create/generate-areas', 200, 150, { userId: '123' });
```

## Best practices for Edge Runtime

1. **ALWAYS use console.error()**: Edge Runtime doesn't reliably show console.log()
   - Use `console.error()` for ALL logs (info, debug, warn, error)
   - Prefix with log level: `console.error('[INFO] message')` or `console.error('[ERROR] message')`

2. **Keep logs concise**: Very long logs may be truncated in Edge Runtime

3. **Use structured logging**: Include context objects for better debugging
   ```typescript
   console.error('[ERROR] Request failed:', JSON.stringify({ userId, error: error.message }));
   ```

4. **Check Function Logs, filter by Edge**: Runtime logs appear in Function Logs, filter by "Edge" runtime

5. **Use request IDs**: Include request IDs in logs for tracking
   ```typescript
   const requestId = req.headers.get('x-vercel-id') || `req-${Date.now()}`;
   console.error(`[${requestId}] Processing request`);
   ```

6. **Set up Log Drains**: For production, consider setting up Log Drains to persist Edge logs

## Setting up Log Drains (Optional)

To persist logs beyond Vercel's retention period:

1. Go to Project Settings → Log Drains
2. Connect a service like:
   - Datadog
   - Logtail
   - Axiom
   - Or any service that accepts syslog

## Troubleshooting Edge Runtime Logs

If logs still don't appear:

1. **Verify you're using console.error()**: 
   - Edge Runtime doesn't show console.log() reliably
   - Replace all console.log() with console.error() in production
   - Use prefixes to indicate log level: `[INFO]`, `[ERROR]`, `[DEBUG]`

2. **Check Function Logs, filter by Edge Runtime**:
   - Go to: Vercel Dashboard → Your Project → Logs → Function Logs
   - Filter by "Edge" runtime type (if filter available)
   - Or: Vercel Dashboard → Your Project → Deployments → [Select Deployment] → Function Logs

3. **Check the correct deployment**: Make sure you're looking at the active deployment
   - The active deployment has a green checkmark
   - Make sure you're not looking at an old deployment

4. **Use Real-time Logs**: Try the real-time logs feature to see live output
   - In Vercel dashboard, look for "Real-time Logs" or "Live Logs" option
   - This shows logs as they happen

5. **Test with the test endpoint**: 
   - Call `GET /api/test-logs` to verify logging works
   - This endpoint uses console.error() which should appear in Edge logs

6. **Check function execution**: Verify the function is actually being called
   - Check response times in Vercel dashboard
   - Verify the function is returning responses (even errors)
   - Edge functions show up separately from Node.js functions

7. **Vercel CLI for live Edge logs**:
   ```bash
   vercel logs --follow
   ```
   This shows real-time logs from the CLI, including Edge functions

8. **Edge Runtime limitations**:
   - Edge Runtime uses Web APIs, not Node.js APIs
   - Some logging methods may not work
   - Always use console.error() for reliability

9. **Verify environment**:
   - Make sure you're checking logs for the correct environment (production/preview)
   - Preview deployments have separate logs from production

10. **Check for Edge function timeouts**:
    - Edge functions have a 30-second timeout by default
    - If functions timeout, logs might not flush
    - Check function execution time in Vercel dashboard

