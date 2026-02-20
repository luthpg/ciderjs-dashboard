/**
 * LAPRAS ポートフォリオ JSON 型定義
 * Endpoint: https://lapras.com/public/[username].json
 */

export interface LaprasPortfolio {
  name: string;
  description: string;
  iconimage_url: string;
  /** 技術力 */
  e_score: number;
  /** ビジネス */
  b_score: number;
  /** 影響力 */
  i_score: number;
  enable_it_engineer: boolean;

  // 各プラットフォームの投稿・リポジトリ
  qiita_articles: QiitaArticle[];
  zenn_articles: ZennArticle[];
  note_articles: NoteArticle[];
  blog_articles: BlogArticle[];
  hatena_articles: HatenaArticle[];
  speaker_deck_slides: SpeakerDeckSlide[];
  github_repositories: GithubRepository[];

  // その他アクティビティ
  teratail_replies: any[]; // データの存在が確認できなかったためany
  events: any[]; // データの存在が確認できなかったためany
  activities: LaprasActivity[];
}

export interface QiitaArticle {
  title: string;
  url: string;
  updated_at: string;
  tags: string[];
  stockers_count: number;
  headlines: string[];
}

export interface ZennArticle {
  title: string;
  url: string;
  posted_at: string;
  tags: string[];
}

export interface NoteArticle {
  title: string;
  url: string;
  published_at: string;
  tags: string[];
  like_count: number;
}

export interface BlogArticle {
  title: string;
  url: string;
  published_at: string;
}

export interface HatenaArticle {
  title: string;
  url: string;
  published_at: string;
}

export interface SpeakerDeckSlide {
  title: string;
  url: string;
  published_at: string;
}

export interface GithubRepository {
  id: number;
  title: string;
  url: string;
  description: string | null;
  is_owner: boolean;
  is_fork: boolean;
  is_oss: boolean;
  language: string;
  stargazers_count: number;
  stargazers_url: string;
  forks: number;
  contributors_count: number;
  contributors_url: string;
  contributions: number;
  contributions_url: string;
  languages: GithubLanguage[];
}

export interface GithubLanguage {
  name: string;
  bytes: number;
}

export interface LaprasActivity {
  title: string;
  url: string;
  date: string; // ISO 8601 format
  type:
    | 'zenn'
    | 'qiita'
    | 'note'
    | 'github_pr'
    | 'github_issue'
    | 'github_commit'
    | string;
}
