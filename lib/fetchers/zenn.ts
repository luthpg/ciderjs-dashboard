import type { ZennArticle } from '@/types/zenn';

/**
 * Zenn の全記事を再帰的にフェッチ (next_page がなくなるまでループ)
 */
export async function fetchAllZennArticles(
  username: string,
): Promise<ZennArticle[]> {
  const allArticles: ZennArticle[] = [];
  let nextUrl: string | null =
    `https://zenn.dev/api/articles?username=${username}&order=latest`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl);

    if (!res.ok) {
      console.error(`[Zenn] Failed to fetch: ${res.status} ${res.statusText}`);
      break;
    }

    const data: { articles: ZennArticle[]; next_page: number | null } =
      await res.json();

    allArticles.push(...data.articles);

    // next_page が数値で返ってくる場合、URLを再構築
    nextUrl = data.next_page
      ? `https://zenn.dev/api/articles?username=${username}&order=latest&page=${data.next_page}`
      : null;
  }

  return allArticles;
}
