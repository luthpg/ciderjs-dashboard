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
    const results = await Promise.allSettled([
      getWebsiteStats(),
      getTrafficSources(),
      getSiteSummary(),
      fetchGithubRepos(GITHUB_OWNER),
      fetchLaprasStats(LAPRAS_USERNAME),
      Promise.all(NPM_PACKAGES.map((pkg) => fetchNpmPackageSummary(pkg))),
      fetchQiitaArticles(QIITA_USER_ID),
      fetchAllZennArticles(ZENN_USERNAME),
    ]);

    // 結果を安全に展開する
    const [
      ga4PageStatsRes,
      ga4TrafficSources,
      ga4SiteSummaryRes,
      githubRes,
      laprasRes,
      npmRes,
      qiitaRes,
      zennRes,
    ] = results;

    // 失敗したものを特定してログ出力（デバッグ用）
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`API Fetch Error [Index: ${index}]:`, result.reason);
      }
    });

    const updateData: any = { updatedAt: new Date().toISOString(), ga4: {} };
    if (ga4PageStatsRes.status === 'fulfilled')
      updateData.ga4.pageStats = ga4PageStatsRes.value;
    if (ga4TrafficSources.status === 'fulfilled')
      updateData.ga4.trafficSources = ga4TrafficSources.value;
    if (ga4SiteSummaryRes.status === 'fulfilled')
      updateData.ga4.siteSummary = ga4SiteSummaryRes.value;
    if (githubRes.status === 'fulfilled') updateData.github = githubRes.value;
    if (laprasRes.status === 'fulfilled') updateData.lapras = laprasRes.value;
    if (npmRes.status === 'fulfilled') updateData.npm = npmRes.value;
    if (qiitaRes.status === 'fulfilled') updateData.qiita = qiitaRes.value;
    if (zennRes.status === 'fulfilled') updateData.zenn = zennRes.value;

    // 1つのオブジェクトにまとめる
    const aggregatedData = {
      updatedAt: new Date().toISOString(),
      ga4: {
        pageStats: updateData.ga4?.pageStats,
        trafficSources: updateData.ga4?.trafficSources,
        siteSummary: updateData.ga4?.siteSummary,
      },
      github: updateData.github,
      lapras: {
        scores: {
          e_score: updateData.lapras?.e_score,
          b_score: updateData.lapras?.b_score,
          i_score: updateData.lapras?.i_score,
        },
        portfolio: updateData.lapras,
      },
      npm: { packages: updateData.npm },
      qiita: {
        totalArticles: updateData.qiita?.length,
        totalLikes: updateData.qiita?.reduce(
          (sum: number, a: any) => sum + a.likes_count,
          0,
        ),
        articles: updateData.qiita,
      },
      zenn: {
        totalArticles: updateData.zenn?.length,
        totalLikes: updateData.zenn?.reduce(
          (sum: number, a: any) => sum + a.liked_count,
          0,
        ),
        articles: updateData.zenn,
      },
    };

    // Firestore に保存 (ドキュメントを上書き)
    await db
      .collection('dashboard')
      .doc('latest')
      .set(aggregatedData, { merge: true });

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
