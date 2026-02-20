import { NextResponse } from 'next/server';
import {
  getSiteSummary,
  getTrafficSources,
  getWebsiteStats,
} from '@/lib/fetchers/ga4';

export async function GET() {
  try {
    const [pageStats, trafficSources, siteSummary] = await Promise.all([
      getWebsiteStats(),
      getTrafficSources(),
      getSiteSummary(),
    ]);

    return NextResponse.json({
      pageStats,
      trafficSources,
      siteSummary,
    });
  } catch (err) {
    console.error('[API] GA4 fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 data' },
      { status: 500 },
    );
  }
}
