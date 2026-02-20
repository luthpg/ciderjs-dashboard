import { NextResponse } from 'next/server';
import { fetchQiitaArticles } from '@/lib/fetchers/qiita';

const QIITA_USER_ID = 'luth';

export async function GET() {
  try {
    const articles = await fetchQiitaArticles(QIITA_USER_ID);

    const totalLikes = articles.reduce((sum, a) => sum + a.likes_count, 0);
    const totalStocks = articles.reduce((sum, a) => sum + a.stocks_count, 0);

    return NextResponse.json({
      userId: QIITA_USER_ID,
      totalArticles: articles.length,
      totalLikes,
      totalStocks,
      articles,
    });
  } catch (err) {
    console.error('[API] Qiita fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Qiita data' },
      { status: 500 },
    );
  }
}
