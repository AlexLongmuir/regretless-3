import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabaseServer';

// Public endpoint: returns default celebrity list with signed image URLs.
export async function GET(_request: NextRequest) {
  const supabase = supabaseServer();

  try {
    // Prefer table if exists; fallback to storage listing
    let celebrities: any[] | null = null;
    try {
      console.error('🔍 Querying celebrity_profiles table...')
      const { data, error } = await supabase
        .from('celebrity_profiles')
        .select('id, name, image_url, description, category')
        .order('name', { ascending: true });
      console.error('📊 Celebrity profiles query result:', { data, error })
      if (!error && data) celebrities = data;
    } catch (e) {
      console.error('❌ Error querying celebrity_profiles:', e)
      // table may not exist yet
    }

    if (celebrities && celebrities.length > 0) {
      console.error('✅ Found celebrities in database:', celebrities.length)
      // If rows contain storage paths, sign them; else pass through absolute URLs
      const withUrls = await Promise.all(
        celebrities.map(async (c) => {
          if (c.image_url && !c.image_url.startsWith('http')) {
            const { data: signed, error } = await supabase.storage
              .from('celebrity-images')
              .createSignedUrl(c.image_url, 60 * 60 * 24 * 365);
            return { ...c, signed_url: signed?.signedUrl ?? null };
          }
          return { ...c, signed_url: c.image_url ?? null };
        })
      );

      console.error('📸 Processed celebrities with URLs:', withUrls.length)
      return NextResponse.json({ success: true, data: { celebrities: withUrls } });
    }

    // Fallback: list default directory in storage
    const { data: files, error: listError } = await supabase.storage
      .from('celebrity-images')
      .list('default', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

    if (listError) {
      return NextResponse.json({ success: true, data: { celebrities: [] } });
    }

    const items = await Promise.all((files ?? []).map(async (file) => {
      const { data: signed } = await supabase.storage
        .from('celebrity-images')
        .createSignedUrl(`default/${file.name}`, 60 * 60 * 24 * 365);
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      return {
        id: file.id ?? file.name,
        name,
        image_url: `default/${file.name}`,
        signed_url: signed?.signedUrl ?? null,
        description: null,
        category: null,
      };
    }));

    return NextResponse.json({ success: true, data: { celebrities: items } });
  } catch (error) {
    console.error('Error loading celebrities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


