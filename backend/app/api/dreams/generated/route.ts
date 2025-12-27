import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = supabaseServerAuth(token);
    const { data: userData } = await sb.auth.getUser();
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sourceType = searchParams.get('source_type');

    console.log('🔍 Querying ai_generated_dreams for user:', user.id, 'sourceType:', sourceType);

    let query = sb.from('ai_generated_dreams')
      .select('id, title, emoji, source_type, source_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sourceType) query = query.eq('source_type', sourceType);

    const { data, error } = await query;
    console.log('📊 Generated dreams query result:', { data, error });
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { dreams: data ?? [] } });
  } catch (error) {
    console.error('Get generated dreams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


