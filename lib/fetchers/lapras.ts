import type { LaprasPortfolio } from '@/types/lapras';

/**
 * LAPRAS のポートフォリオ JSON を取得
 */
export async function fetchLaprasStats(
  username: string,
): Promise<LaprasPortfolio> {
  const res = await fetch(`https://lapras.com/public/${username}.json`);

  if (!res.ok) {
    throw new Error(
      `[Lapras] Failed to fetch: ${res.status} ${res.statusText}`,
    );
  }

  const data: LaprasPortfolio = await res.json();
  return data;
}
