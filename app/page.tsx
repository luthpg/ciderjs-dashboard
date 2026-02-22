'use client';

import { SiNpm, SiQiita, SiZenn } from '@icons-pack/react-simple-icons';
import {
  Activity,
  BookOpen,
  Box,
  ExternalLink,
  RefreshCw,
  Star,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import useSWR from 'swr';
import { DashboardSkeleton } from '@/components/dashboard-skeleton';
import { ModeToggle } from '@/components/mode-toggle';
import { Badge } from '@/components/ui/badge';
import { BarChart } from '@/components/ui/bar-chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { truncateByDisplayWidth } from '@/lib/utils';
import type { Ga4PageStats, Ga4SiteSummary } from '@/types/ga4';
import type { GithubOverview } from '@/types/github';
import type { LaprasPortfolio } from '@/types/lapras';
import type { NpmPackageSummary } from '@/types/npm';
import type { QiitaArticle } from '@/types/qiita';
import type { ZennArticle } from '@/types/zenn';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FetcherData {
  updatedAt: string;
  ga4?: { pageStats: Ga4PageStats[]; siteSummary: Ga4SiteSummary };
  github?: GithubOverview;
  lapras?: {
    username: string;
    portfolio: LaprasPortfolio;
  };
  npm?: { packages: NpmPackageSummary[] };
  qiita?: {
    totalArticles: number;
    totalLikes: number;
    articles: QiitaArticle[];
  };
  zenn?: {
    totalArticles: number;
    totalLikes: number;
    articles: ZennArticle[];
  };
}

export default function Dashboard() {
  const { data, error, isLoading } = useSWR<FetcherData>(
    '/api/dashboard',
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000,
    },
  );

  // 記事統合・名寄せロジック
  const mergedArticles = useMemo(() => {
    const articleMap = new Map<
      string,
      {
        title: string;
        date: string;
        tags: string[];
        platforms: {
          emoji?: string;
          type: string;
          url: string;
          likes: number;
          stocks: number;
        }[];
      }
    >();

    // Zenn記事の処理
    data?.zenn?.articles.forEach((a: ZennArticle) => {
      const existing = articleMap.get(a.title);
      const zennUrl = `https://zenn.dev${a.path}`;

      if (existing) {
        existing.platforms.push({
          emoji: a.emoji,
          type: 'Zenn',
          url: zennUrl,
          likes: a.liked_count,
          stocks: a.bookmarked_count,
        });

        if (new Date(a.published_at) > new Date(existing.date)) {
          existing.date = a.published_at;
        }
      } else {
        articleMap.set(a.title, {
          title: a.title,
          date: a.published_at,
          tags: [], // Zenn API（/articles）にタグが含まれない場合は空配列
          platforms: [
            {
              type: 'Zenn',
              emoji: a.emoji,
              url: zennUrl,
              likes: a.liked_count,
              stocks: a.bookmarked_count,
            },
          ],
        });
      }
    });

    // Qiita記事の処理
    data?.qiita?.articles.forEach((a: QiitaArticle) => {
      const existing = articleMap.get(a.title);
      if (existing) {
        existing.platforms.push({
          type: 'Qiita',
          url: a.url,
          likes: a.likes_count,
          stocks: a.stocks_count,
        });
        existing.tags.push(...a.tags.map((t) => t.name));

        if (new Date(a.updated_at) > new Date(existing.date)) {
          existing.date = a.updated_at;
        }
      } else {
        articleMap.set(a.title, {
          title: a.title,
          date: a.updated_at,
          // QiitaTag[] から string[] に変換
          tags: a.tags.map((t) => t.name),
          platforms: [
            {
              type: 'Qiita',
              url: a.url,
              likes: a.likes_count,
              stocks: a.stocks_count,
            },
          ],
        });
      }
    });

    return Array.from(articleMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [data?.qiita, data?.zenn]);

  // GA4データとZenn記事データのマージ
  const articleViewsData = useMemo(() => {
    if (!data?.zenn?.articles || !data?.ga4?.pageStats) return [];

    const merged = data.zenn.articles.map((article: any) => {
      const slug = article.slug || article.path.split('/').pop();
      const matchedGaData = data.ga4?.pageStats.find((ga: any) =>
        ga.path.includes(slug),
      );
      const views = matchedGaData ? Number(matchedGaData.views) : 0;

      return {
        fullTitle: `${article.emoji} ${article.title}`,
        displayTitle: truncateByDisplayWidth(article.title, 11),
        PV: views, // カテゴリ1: キー名を'PV'に変更
        いいね: article.liked_count, // カテゴリ2: Zennのいいね数を追加
      };
    });

    // PV数が多い順にソートし、トップ10を取得
    return merged.sort((a: any, b: any) => b.PV - a.PV).slice(0, 10);
  }, [data]);

  if (isLoading) return <DashboardSkeleton />;
  if (error)
    return (
      <div className="p-8 text-destructive">Failed to load dashboard data.</div>
    );
  if (!data)
    return (
      <div className="p-8">
        No data available. Please run the batch update first.
      </div>
    );

  // サマリーカード用のデータマッピング
  const stats = [
    {
      title: 'Lapras 技術スコア',
      value: data.lapras?.portfolio.e_score?.toFixed(2) || '0.00',
      icon: Activity,
      desc: 'Laprasによる技術スコア評価値',
    },
    {
      title: 'GitHub Stars',
      value: data.github?.totalStars.toLocaleString() || '0',
      icon: Star,
      desc: 'GitHubリポジトリ全体のスター数',
    },
    {
      title: '記事数',
      value: (
        (data.qiita?.totalArticles || 0) + (data.zenn?.totalArticles || 0)
      ).toString(),
      icon: BookOpen,
      desc: 'Zenn & Qiitaの合計記事数',
    },
    {
      title: '月間訪問者数',
      value: data.ga4?.siteSummary.totalUsers.toLocaleString() || '0',
      icon: Users,
      desc: 'Zenn記事の合計訪問者数（過去30日間）',
    },
  ];

  // 最近のアクティビティ (Laprasの統合フィードを使用)
  const activities = data.lapras?.portfolio.activities.slice(0, 15) || [];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 space-y-6 container mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Ciderjs Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">最新のアウトプットの概要</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs md:text-sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync: {new Date(data.updatedAt).toLocaleString('ja-JP')}
          </Badge>
          <ModeToggle />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={`stat|${stat.title}`} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-y-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="oss">OSS & npm</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* GA4 Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>記事別 ビュー数 (Zenn)</CardTitle>
                <CardDescription>
                  Zennで公開した記事のアクセス数トップ10
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-0">
                {/* 1. 外側のコンテナに overflow-x-auto を設定 */}
                <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                  {/* 2. 内部のコンテナに min-width を設定。md（デスクトップ）以上では 100% に戻す */}
                  <div className="min-w-[600px] w-full h-[450px]">
                    <BarChart
                      data={articleViewsData}
                      index="displayTitle"
                      categories={['PV', 'いいね']}
                      colors={['emerald', 'cyan']}
                      layout="vertical"
                      valueFormatter={(number: number) =>
                        Intl.NumberFormat('ja-JP').format(number)
                      }
                      showLegend={true}
                      className="text-muted-foreground h-full w-full"
                      yAxisWidth={200}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activities from Lapras */}
            <Card className="shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle>最近の活動</CardTitle>
                <CardDescription>Laprasによる統合フィード</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-6">
                  {activities.map((activity) => (
                    <div
                      key={`activity|${activity.title}|${activity.date}`}
                      className="flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <a
                          href={activity.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium leading-tight hover:underline flex items-center gap-1"
                        >
                          {activity.title}
                          <ExternalLink className="h-3 w-3 inline opacity-50" />
                        </a>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1 py-0"
                          >
                            {activity.type}
                          </Badge>
                          <span>
                            {new Date(activity.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="oss" className="space-y-4">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>npm Packages</CardTitle>
              <CardDescription>公開ライブラリの指標</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* モバイルでテーブルがはみ出さないように overflow-x-auto を設定 */}
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>パッケージ名</TableHead>
                      <TableHead>バージョン</TableHead>
                      <TableHead>ダウンロード数（週次）</TableHead>
                      <TableHead className="text-right">
                        インストールサイズ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.npm?.packages.map((pkg) => (
                      <TableRow key={`npm|${pkg.info.name}`}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <SiNpm className="h-4 w-4 text-[#CB3837]" />
                          {pkg.info.name}
                        </TableCell>
                        <TableCell>{pkg.info.version}</TableCell>
                        <TableCell>
                          {pkg.downloads.weeklyDownloads.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {pkg.packageSize
                            ? `${(pkg.packageSize.installSize / 1024).toFixed(1)} kB`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="articles" className="space-y-4">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>公開記事</CardTitle>
              <CardDescription>ZennとQiitaの記事一覧</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* モバイルでテーブルがはみ出さないように overflow-x-auto を設定 */}
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">
                        プラットフォーム
                      </TableHead>
                      <TableHead>タイトル</TableHead>
                      <TableHead className="text-left w-[150px]">
                        エンゲージメント
                      </TableHead>
                      <TableHead>タグ</TableHead>
                      <TableHead className="w-[120px]">最終更新日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergedArticles.map((article) => (
                      <TableRow key={`article|${article.title}`}>
                        <TableCell>
                          <div className="flex gap-2">
                            {article.platforms.map((p: any) => (
                              <a
                                key={p.type}
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={
                                  p.type === 'Zenn'
                                    ? 'text-[#3EA8FF]'
                                    : 'text-[#55C500]'
                                }
                              >
                                {p.type === 'Zenn' ? (
                                  <SiZenn className="h-5 w-5" />
                                ) : (
                                  <SiQiita className="h-5 w-5" />
                                )}
                              </a>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[400px]">
                          <div className="truncate" title={article.title}>
                            <a
                              key={article.platforms[0].type}
                              href={article.platforms[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={
                                article.platforms[0].type === 'Zenn'
                                  ? 'text-[#3EA8FF]'
                                  : 'text-[#55C500]'
                              }
                            >
                              {article.title}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex flex-col items-start gap-1">
                            {article.platforms.map((p: any) => (
                              <div
                                key={p.type}
                                className="flex items-center gap-2 text-[11px] text-muted-foreground"
                              >
                                <span>{p.type}:</span>
                                <div className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span className="font-mono">{p.likes}</span>
                                </div>
                                <div className="flex items-center gap-0.5 border-l pl-2">
                                  <Box className="h-3 w-3 text-blue-400" />
                                  <span className="font-mono">{p.stocks}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {article.tags.slice(0, 3).map((tag: string) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] font-normal"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(article.date).toLocaleDateString('ja-JP')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
