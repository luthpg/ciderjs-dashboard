import { NextResponse } from 'next/server';
import { fetchAllZennArticles } from '@/lib/fetchers/zenn';

const ZENN_USERNAME = 'luth';

export async function GET() {
  try {
    const articles = await fetchAllZennArticles(ZENN_USERNAME);

    return NextResponse.json({
      username: ZENN_USERNAME,
      totalArticles: articles.length,
      totalLikes: articles.reduce((sum, a) => sum + a.liked_count, 0),
      articles,
    });
  } catch (err) {
    console.error('[API] Zenn fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Zenn data' },
      { status: 500 },
    );
  }
}
