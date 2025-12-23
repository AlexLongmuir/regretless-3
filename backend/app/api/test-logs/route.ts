import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify Vercel logging is working
 * Call this endpoint and check Function Logs in Vercel dashboard
 */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-vercel-id') || `test-${Date.now()}`;
  
  // Test different logging methods
  // NOTE: For Edge Runtime, only console.error() reliably appears in Vercel logs
  console.error(`[TEST-LOGS] [${requestId}] [INFO] console.error test (use this for all logs in Edge Runtime)`);
  console.error(`[TEST-LOGS] [${requestId}] [ERROR] console.error test for errors`);
  console.error(`[TEST-LOGS] [${requestId}] [WARN] console.error test for warnings`);
  
  // These may not appear in Edge Runtime logs:
  console.log(`[TEST-LOGS] [${requestId}] console.log test (may not appear in Edge Runtime)`);
  console.warn(`[TEST-LOGS] [${requestId}] console.warn test (may not appear in Edge Runtime)`);
  
  // Test structured logging
  console.error(`[TEST-LOGS] [${requestId}] Structured log:`, JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId,
    test: true,
  }, null, 2));
  
  // Test error logging
  try {
    throw new Error('Test error for logging');
  } catch (error) {
    console.error(`[TEST-LOGS] [${requestId}] Caught test error:`, error);
    if (error instanceof Error) {
      console.error(`[TEST-LOGS] [${requestId}] Error name:`, error.name);
      console.error(`[TEST-LOGS] [${requestId}] Error message:`, error.message);
      console.error(`[TEST-LOGS] [${requestId}] Error stack:`, error.stack);
    }
  }
  
  return NextResponse.json({
    success: true,
    message: 'Check Function Logs in Vercel dashboard for test logs',
    requestId,
    timestamp: new Date().toISOString(),
  });
}

