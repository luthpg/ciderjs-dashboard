/** Qiita API v2 型定義 */

export interface QiitaArticle {
  /** 記事 ID */
  id: string;
  /** タイトル */
  title: string;
  /** URL */
  url: string;
  /** 作成日 (ISO 8601) */
  created_at: string;
  /** 更新日 (ISO 8601) */
  updated_at: string;
  /** タグ一覧 */
  tags: QiitaTag[];
  /** いいね数 */
  likes_count: number;
  /** ストック数 (API の /items/:id/stockers から取得するため別途) */
  stocks_count: number;
  /** ページビュー数 (認証ユーザーのみ) */
  page_views_count: number | null;
  /** 限定公開かどうか */
  private: boolean;
}

export interface QiitaTag {
  name: string;
  versions: string[];
}
