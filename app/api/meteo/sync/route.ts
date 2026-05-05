  import { NextResponse } from 'next/server';
import { syncChantiersMeteo } from '@/lib/meteo';

export async function GET(request: Request) {
  // Optionnel: vérifier une clé secrète pour éviter que n'importe qui appelle la route cron
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await syncChantiersMeteo();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Meteo Sync Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
