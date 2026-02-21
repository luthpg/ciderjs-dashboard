import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
// 各種フェッチャーのインポート
import {
  getSiteSummary,
  getTrafficSources,
  getWebsiteStats,
} from '@/lib/fetchers/ga4';
import { fetchGithubRepos } from '@/lib/fetchers/github';
import { fetchLaprasStats } from '@/lib/fetchers/lapras';
import { fetchNpmPackageSummary } from '@/lib/fetchers/npm';
import { fetchQiitaArticles } from '@/lib/fetchers/qiita';
import { fetchAllZennArticles } from '@/lib/fetchers/zenn';
import { db } from '@/lib/firebase-admin';

const GITHUB_OWNER = env.NEXT_PUBLIC_GITHUB_USER_NAME;
const LAPRAS_USERNAME = env.NEXT_PUBLIC_USER_NAME;
const QIITA_USER_ID = env.NEXT_PUBLIC_USER_NAME;
const ZENN_USERNAME = env.NEXT_PUBLIC_USER_NAME;
const NPM_PACKAGES = env.NEXT_PUBLIC_OSS_PACKAGES.split(',');

export async function GET(request: Request) {
  // セキュリティチェック：許可されたリクエスト（Cronジョブなど）のみ実行
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 全外部APIを並列でフェッチ
    const [
      ga4PageStats,
      ga4TrafficSources,
      ga4SiteSummary,
      github,
      laprasPortfolio,
      npmResults,
      qiitaArticles,
      zennArticles,
    ] = await Promise.all([
      getWebsiteStats(),
      getTrafficSources(),
      getSiteSummary(),
      fetchGithubRepos(GITHUB_OWNER),
      fetchLaprasStats(LAPRAS_USERNAME),
      Promise.all(NPM_PACKAGES.map((pkg) => fetchNpmPackageSummary(pkg))),
      fetchQiitaArticles(QIITA_USER_ID),
      fetchAllZennArticles(ZENN_USERNAME),
    ]);

    // 1つのオブジェクトにまとめる
    const aggregatedData = {
      updatedAt: new Date().toISOString(),
      ga4: {
        pageStats: ga4PageStats,
        trafficSources: ga4TrafficSources,
        siteSummary: ga4SiteSummary,
      },
      github,
      lapras: {
        scores: {
          e_score: laprasPortfolio.e_score,
          b_score: laprasPortfolio.b_score,
          i_score: laprasPortfolio.i_score,
        },
        portfolio: laprasPortfolio,
      },
      npm: { packages: npmResults },
      qiita: {
        totalArticles: qiitaArticles.length,
        totalLikes: qiitaArticles.reduce((sum, a) => sum + a.likes_count, 0),
        articles: qiitaArticles,
      },
      zenn: {
        totalArticles: zennArticles.length,
        totalLikes: zennArticles.reduce((sum, a) => sum + a.liked_count, 0),
        articles: zennArticles,
      },
    };

    // Firestore に保存 (ドキュメントを上書き)
    await db.collection('dashboard').doc('latest').set(aggregatedData);

    return NextResponse.json({
      message: 'Dashboard data updated successfully',
      updatedAt: aggregatedData.updatedAt,
    });
  } catch (error: any) {
    console.error('[Batch Update Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 },
    );
  }
}
