import { NextResponse } from 'next/server';
import { supabaseServer, supabaseServerAuth } from '../../../../lib/supabaseServer';

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ','');
  if (!token) return null;
  const sb = supabaseServer();
  const { data, error } = await sb.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

export async function POST(req: Request) {
  console.log('⏰ [DEFER API] POST request received');
  
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ','');
    if (!token) {
      console.error('❌ [DEFER API] Unauthorized - no token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUser(req);
    console.log('👤 [DEFER API] User auth result:', user ? `User ID: ${user.id}` : 'No user');
    
    if (!user) {
      console.error('❌ [DEFER API] Unauthorized - invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('📝 [DEFER API] Request body:', JSON.stringify(body, null, 2));
    
    const { occurrenceId, newDueDate } = body;

    if (!occurrenceId || !newDueDate) {
      console.error('❌ [DEFER API] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use authenticated client that respects RLS
    const sb = supabaseServerAuth(token);
    console.log('🔗 [DEFER API] Authenticated Supabase client created');

    // Check if occurrence exists and user has access to it
    const { data: owns, error: checkError } = await sb
      .from('action_occurrences')
      .select('id, dream_id')
      .eq('id', occurrenceId)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ [DEFER API] Error checking occurrence access:', checkError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    if (!owns) {
      console.error('❌ [DEFER API] Occurrence not found or access denied');
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Update the action occurrence with the new due date
    console.log('⏰ [DEFER API] Deferring occurrence:', occurrenceId, 'to:', newDueDate);
    const { data, error } = await sb
      .from('action_occurrences')
      .update({ 
        due_on: newDueDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', occurrenceId)
      .select()
      .single();

    if (error) {
      console.error('❌ [DEFER API] Update error:', error);
      return NextResponse.json({ error: 'Failed to defer action occurrence' }, { status: 500 });
    }

    console.log('✅ [DEFER API] Occurrence deferred successfully');
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Action occurrence deferred successfully' 
    });

  } catch (error) {
    console.error('💥 [DEFER API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}