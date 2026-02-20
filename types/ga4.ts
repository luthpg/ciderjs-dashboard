/** GA4 Analytics Data API 型定義 */

export interface Ga4PageStats {
  /** ページパス (例: /blog/my-article) */
  path: string;
  /** ページビュー数 */
  views: number;
  /** アクティブユーザー数 */
  users: number;
}

export interface Ga4TrafficSource {
  /** 流入元チャネル (organic, social, direct, referral 等) */
  channel: string;
  /** セッション数 */
  sessions: number;
  /** ユーザー数 */
  users: number;
}

export interface Ga4SiteSummary {
  /** 合計セッション数 */
  totalSessions: number;
  /** 合計ユーザー数 */
  totalUsers: number;
  /** 合計ページビュー数 */
  totalPageViews: number;
  /** 集計開始日 */
  startDate: string;
  /** 集計終了日 */
  endDate: string;
}
