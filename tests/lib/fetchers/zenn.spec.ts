import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllZennArticles } from '@/lib/fetchers/zenn';

global.fetch = vi.fn();

describe('fetchAllZennArticles', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('1ページのみで全記事を取得できること（next_pageがnull）', async () => {
    const mockArticles = [{ id: 1, title: 'Test Article 1' }];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ articles: mockArticles, next_page: null }),
    });

    const result = await fetchAllZennArticles('testuser');

    expect(result).toEqual(mockArticles);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://zenn.dev/api/articles?username=testuser&order=latest',
    );
  });

  it('ページネーション(next_page)を辿って複数ページの記事を結合できること', async () => {
    const page1Articles = [{ id: 1, title: 'Page 1 Article' }];
    const page2Articles = [{ id: 2, title: 'Page 2 Article' }];

    // 1回目のfetch: next_page = 2
    // 2回目のfetch: next_page = null
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: page1Articles, next_page: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: page2Articles, next_page: null }),
      });

    const result = await fetchAllZennArticles('testuser');

    // 両ページの記事がマージされていること
    expect(result).toEqual([...page1Articles, ...page2Articles]);

    // APIが正しく2回叩かれていること
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://zenn.dev/api/articles?username=testuser&order=latest',
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://zenn.dev/api/articles?username=testuser&order=latest&page=2',
    );
  });

  it('APIリクエスト失敗時にループを抜けてそこまでのデータを返すこと', async () => {
    const page1Articles = [{ id: 1, title: 'Page 1 Article' }];

    // 1回目は成功し、2回目でサーバーエラーになる想定
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: page1Articles, next_page: 2 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

    const result = await fetchAllZennArticles('testuser');

    // エラーで終了しても、1回目のデータは取得できていること
    expect(result).toEqual(page1Articles);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
