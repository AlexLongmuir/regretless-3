import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const sb = supabaseServer();
    
    const { data, error } = await sb
      .from('onboarding_sessions')
      .select('data')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      // It's okay if not found, just return null
      if (error.code === 'PGRST116') {
         return NextResponse.json({ data: null });
      }
      console.error('[ONBOARDING-SYNC] Error fetching session:', error);
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    return NextResponse.json({ data: data?.data });
  } catch (error) {
    console.error('[ONBOARDING-SYNC] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, data, deviceId } = body;

    if (!sessionId || !data) {
      return NextResponse.json({ error: 'Missing sessionId or data' }, { status: 400 });
    }

    const sb = supabaseServer();
    
    // Upsert the session data
    // using upsert with the session_id
    const { error } = await sb
      .from('onboarding_sessions')
      .upsert({
        session_id: sessionId,
        data: data,
        device_id: deviceId || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      });

    if (error) {
      console.error('[ONBOARDING-SYNC] Error upserting session:', error);
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ONBOARDING-SYNC] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
