import type { QiitaArticle } from '@/types/qiita';

const QIITA_API_BASE = 'https://qiita.com/api/v2';

function getToken(): string {
  const token = process.env.QIITA_TOKEN;
  if (!token) {
    throw new Error('QIITA_TOKEN is not set');
  }
  return token;
}

/**
 * Qiita API v2 で指定ユーザーの全記事を取得 (ページネーション対応)
 * page_views_count は認証ユーザー自身の記事でのみ取得可能
 */
export async function fetchQiitaArticles(
  userId: string,
): Promise<QiitaArticle[]> {
  const token = getToken();
  const allArticles: QiitaArticle[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${QIITA_API_BASE}/items?query=user:${userId}&page=${page}&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(
        `[Qiita] Failed to fetch articles: ${res.status} ${res.statusText}`,
      );
    }

    const articles: QiitaArticle[] = await res.json();

    if (articles.length === 0) {
      break;
    }

    allArticles.push(...articles);

    // Qiita API は最大ページ数を Total-Count ヘッダで返す
    const totalCount = Number(res.headers.get('Total-Count') ?? 0);
    if (allArticles.length >= totalCount) {
      break;
    }

    page++;
  }

  return allArticles;
}
