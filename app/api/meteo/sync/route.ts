  import { NextResponse } from 'next/server';
import { syncChantiersMeteo } from '@/lib/meteo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  // Toujours autoriser si on est en local pour le test ou avec la clé
  if (process.env.NODE_ENV !== 'production' || (process.env.CRON_SECRET && key === process.env.CRON_SECRET)) {
    if (process.env.NODE_ENV !== 'production' && key !== process.env.CRON_SECRET) {
      console.warn('[METEO SYNC] Bypassing CRON_SECRET check in development mode.');
    }
    try {
      const results = await syncChantiersMeteo();
      return NextResponse.json({ success: true, results });
    } catch (error) {
      console.error('Meteo Sync Error:', error);
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
