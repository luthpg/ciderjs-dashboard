import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { fetchLaprasStats } from '@/lib/fetchers/lapras';

const LAPRAS_USERNAME = env.NEXT_PUBLIC_USER_NAME;

export async function GET() {
  try {
    const portfolio = await fetchLaprasStats(LAPRAS_USERNAME);

    return NextResponse.json({
      username: LAPRAS_USERNAME,
      portfolio,
    });
  } catch (err) {
    console.error('[API] Lapras fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Lapras data' },
      { status: 500 },
    );
  }
}
