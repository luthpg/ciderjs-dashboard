/** GitHub GraphQL API 型定義 */

export interface GithubRepoStats {
  /** リポジトリ名 */
  name: string;
  /** フルネーム (owner/repo) */
  nameWithOwner: string;
  /** 説明 */
  description: string | null;
  /** リポジトリ URL */
  url: string;
  /** Star 数 */
  stargazerCount: number;
  /** Fork 数 */
  forkCount: number;
  /** Open Issue 数 */
  openIssueCount: number;
  /** メイン言語 */
  primaryLanguage: string | null;
  /** 最終更新日 (ISO 8601) */
  updatedAt: string;
  /** フォーク元かどうか */
  isFork: boolean;
  /** アーカイブ済みかどうか */
  isArchived: boolean;
}

export interface GithubOverview {
  /** ユーザー / Organization 名 */
  owner: string;
  /** トータル Star 数 */
  totalStars: number;
  /** トータル Fork 数 */
  totalForks: number;
  /** リポジトリ一覧 */
  repositories: GithubRepoStats[];
}
