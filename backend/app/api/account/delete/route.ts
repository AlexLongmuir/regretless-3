import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';

export async function DELETE(request: NextRequest) {
  console.log('🗑️ [ACCOUNT DELETE API] DELETE request received');
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('❌ [ACCOUNT DELETE API] Unauthorized - no token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await supabaseServerAuth(token).auth.getUser();
    console.log('👤 [ACCOUNT DELETE API] User auth result:', user.data.user ? `User ID: ${user.data.user.id}` : 'No user');
    
    if (!user.data.user) {
      console.error('❌ [ACCOUNT DELETE API] Unauthorized - invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.data.user.id;
    const sb = supabaseServerAuth(token);
    console.log('🔗 [ACCOUNT DELETE API] Authenticated Supabase client created');

    // Start a transaction-like approach by doing soft deletes in order
    // We'll use timestamps to mark everything as deleted rather than hard deletes
    
    const deletedAt = new Date().toISOString();
    console.log('🗑️ [ACCOUNT DELETE API] Starting soft delete process for user:', userId);

    // 1. Skip action_artifacts deletion for now (they're just file references)
    console.log('🗑️ [ACCOUNT DELETE API] Skipping action artifacts deletion...');

    // 2. Get all dream IDs for the user first
    const { data: dreams, error: dreamsError } = await sb
      .from('dreams')
      .select('id')
      .eq('user_id', userId);

    if (dreamsError) {
      console.error('Error fetching dreams:', dreamsError);
      return NextResponse.json({ error: 'Failed to fetch dreams' }, { status: 500 });
    }

    if (!dreams || dreams.length === 0) {
      return NextResponse.json({ success: true, message: 'No data to delete' });
    }

    const dreamIds = dreams.map(d => d.id);

    // 3. Get all area IDs for these dreams
    const { data: areas, error: areasError } = await sb
      .from('areas')
      .select('id')
      .in('dream_id', dreamIds);

    if (areasError) {
      console.error('Error fetching areas:', areasError);
      return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 });
    }

    const areaIds = areas?.map(a => a.id) || [];

    // 4. Get all action IDs for these areas
    const { data: actions, error: actionsError } = await sb
      .from('actions')
      .select('id')
      .in('area_id', areaIds);

    if (actionsError) {
      console.error('Error fetching actions:', actionsError);
      return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 });
    }

    const actionIds = actions?.map(a => a.id) || [];

    // 5. Delete action_occurrences
    console.log('🗑️ [ACCOUNT DELETE API] Deleting action occurrences...');
    const { error: occurrencesError } = await sb
      .from('action_occurrences')
      .delete()
      .in('action_id', actionIds);

    if (occurrencesError) {
      console.error('❌ [ACCOUNT DELETE API] Error deleting occurrences:', occurrencesError);
      // Continue anyway
    }

    // 6. Soft delete actions
    console.log('🗑️ [ACCOUNT DELETE API] Soft deleting actions...');
    const { error: actionsDeleteError } = await sb
      .from('actions')
      .update({ deleted_at: deletedAt })
      .in('id', actionIds);

    if (actionsDeleteError) {
      console.error('❌ [ACCOUNT DELETE API] Error soft deleting actions:', actionsDeleteError);
      return NextResponse.json({ error: 'Failed to delete actions' }, { status: 500 });
    }

    // 7. Soft delete areas
    console.log('🗑️ [ACCOUNT DELETE API] Soft deleting areas...');
    const { error: areasDeleteError } = await sb
      .from('areas')
      .update({ deleted_at: deletedAt })
      .in('id', areaIds);

    if (areasDeleteError) {
      console.error('❌ [ACCOUNT DELETE API] Error soft deleting areas:', areasDeleteError);
      return NextResponse.json({ error: 'Failed to delete areas' }, { status: 500 });
    }

    // 8. Soft delete dreams
    console.log('🗑️ [ACCOUNT DELETE API] Soft deleting dreams...');
    const { error: dreamsDeleteError } = await sb
      .from('dreams')
      .update({ archived_at: deletedAt })
      .in('id', dreamIds);

    if (dreamsDeleteError) {
      console.error('❌ [ACCOUNT DELETE API] Error soft deleting dreams:', dreamsDeleteError);
      return NextResponse.json({ error: 'Failed to delete dreams' }, { status: 500 });
    }

    // 6. Soft delete notification_preferences (references profiles)
    console.log('🗑️ [ACCOUNT DELETE API] Soft deleting notification preferences...');
    const { error: notificationsError } = await sb
      .from('notification_preferences')
      .delete()
      .eq('user_id', userId);

    if (notificationsError) {
      console.error('❌ [ACCOUNT DELETE API] Error deleting notification preferences:', notificationsError);
      // Continue anyway - this is just preferences
    }

    // 7. Soft delete AI events (references profiles)
    console.log('🗑️ [ACCOUNT DELETE API] Soft deleting AI events...');
    const { error: aiEventsError } = await sb
      .from('ai_events')
      .delete()
      .eq('user_id', userId);

    if (aiEventsError) {
      console.error('❌ [ACCOUNT DELETE API] Error deleting AI events:', aiEventsError);
      // Continue anyway - this is just telemetry
    }

    // 8. Soft delete profile (references auth.users)
    console.log('🗑️ [ACCOUNT DELETE API] Soft deleting profile...');
    const { error: profileError } = await sb
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('❌ [ACCOUNT DELETE API] Error deleting profile:', profileError);
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
    }

    // 9. Finally, delete the auth user (this will cascade to any remaining references)
    console.log('🗑️ [ACCOUNT DELETE API] Deleting auth user...');
    const { error: authError } = await sb.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('❌ [ACCOUNT DELETE API] Error deleting auth user:', authError);
      return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 });
    }

    console.log('✅ [ACCOUNT DELETE API] Account successfully deleted for user:', userId);
    return NextResponse.json({ 
      success: true, 
      message: 'Account successfully deleted' 
    });

  } catch (error) {
    console.error('❌ [ACCOUNT DELETE API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
