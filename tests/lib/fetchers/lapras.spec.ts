import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLaprasStats } from '@/lib/fetchers/lapras';

// fetchをグローバルにモック化
global.fetch = vi.fn();

describe('fetchLaprasStats', () => {
  beforeEach(() => {
    // 各テストの前にモックの呼び出し履歴をリセット
    vi.resetAllMocks();
  });

  it('正常にLAPRASのポートフォリオデータを取得できること', async () => {
    // モックの戻り値を設定
    const mockData = { e_score: 3.5, b_score: 3.0, i_score: 2.5 };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchLaprasStats('testuser');

    // 正しいURLが1回呼ばれたか検証
    expect(global.fetch).toHaveBeenCalledWith(
      'https://lapras.com/public/testuser.json',
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 戻り値が想定通りか検証
    expect(result).toEqual(mockData);
  });

  it('APIエラー(ok: false)時に例外を投げること', async () => {
    // エラー時のモックを設定
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    // 例外がスローされることを検証
    await expect(fetchLaprasStats('testuser')).rejects.toThrow(
      '[Lapras] Failed to fetch: 404 Not Found',
    );
  });
});
