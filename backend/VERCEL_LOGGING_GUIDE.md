# Vercel Logging Guide

## Why logs might not be appearing

1. **Log Location**: Vercel separates logs into two categories:
   - **Deployment Logs**: Build-time logs (npm install, build process)
   - **Function Logs**: Runtime logs from your API routes (console.log, console.error)
   
   **You need to check "Function Logs" in the Vercel dashboard, not "Deployment Logs"**

2. **Log Retention**: 
   - Hobby plan: Logs retained for 1 hour
   - Pro plan: Logs retained for 1 day
   - Enterprise: Custom retention

3. **Log Drains**: By default, Vercel doesn't persist function logs. You need to:
   - Check logs in the Vercel dashboard within the retention period
   - Or set up Log Drains to send logs to a third-party service (Datadog, Logtail, etc.)

4. **Log Buffering**: Logs may be buffered and not appear immediately. This is normal.

## How to view logs in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Click on the "Logs" tab (or "Function Logs" in some views)
4. Select a specific deployment or use "Real-time Logs" for live monitoring
5. Filter by function name if needed

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

## Best practices

1. **Use console.error for important logs**: Vercel's function logs prioritize error-level logs
2. **Keep logs concise**: Very long logs may be truncated
3. **Use structured logging**: Include context objects for better debugging
4. **Check Function Logs, not Deployment Logs**: Runtime logs appear in Function Logs
5. **Set up Log Drains**: For production, consider setting up Log Drains to persist logs

## Setting up Log Drains (Optional)

To persist logs beyond Vercel's retention period:

1. Go to Project Settings → Log Drains
2. Connect a service like:
   - Datadog
   - Logtail
   - Axiom
   - Or any service that accepts syslog

## Troubleshooting

If logs still don't appear:

1. **Verify you're checking Function Logs**: Not Deployment Logs
2. **Check the correct deployment**: Make sure you're looking at the active deployment
3. **Use Real-time Logs**: Try the real-time logs feature to see live output
4. **Test with console.error**: Use `console.error('TEST')` to verify logging works
5. **Check function execution**: Verify the function is actually being called (check response times, etc.)

