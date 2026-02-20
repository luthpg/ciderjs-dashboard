import type {
  NpmDailyDownload,
  NpmDownloadStats,
  NpmPackageInfo,
  NpmPackageSize,
  NpmPackageSummary,
} from '@/types/npm';

/**
 * npm Registry からパッケージのメタデータを取得
 */
export async function fetchNpmPackageInfo(
  packageName: string,
): Promise<NpmPackageInfo> {
  const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`);

  if (!res.ok) {
    console.error(await res.text());
    throw new Error(
      `[npm] Failed to fetch package info for ${packageName}: ${res.status}`,
    );
  }

  const data = await res.json();
  return {
    name: data.name,
    version: data.version,
    description: data.description ?? '',
    lastPublished: data.time ?? new Date().toISOString(),
    url: `https://www.npmjs.com/package/${packageName}`,
  };
}

/**
 * npm Registry の downloads API からダウンロード統計を取得
 */
export async function fetchNpmDownloads(
  packageName: string,
): Promise<NpmDownloadStats> {
  // 日別ダウンロード数 (直近30日)
  const rangeRes = await fetch(
    `https://api.npmjs.org/downloads/range/last-month/${packageName}`,
  );

  if (!rangeRes.ok) {
    throw new Error(
      `[npm] Failed to fetch downloads for ${packageName}: ${rangeRes.status}`,
    );
  }

  const rangeData: { downloads: Array<{ day: string; downloads: number }> } =
    await rangeRes.json();

  const dailyDownloads: NpmDailyDownload[] = rangeData.downloads.map((d) => ({
    day: d.day,
    downloads: d.downloads,
  }));

  const monthlyDownloads = dailyDownloads.reduce(
    (sum, d) => sum + d.downloads,
    0,
  );

  // 直近7日間
  const weeklyDownloads = dailyDownloads
    .slice(-7)
    .reduce((sum, d) => sum + d.downloads, 0);

  return {
    package: packageName,
    weeklyDownloads,
    monthlyDownloads,
    dailyDownloads,
  };
}

/**
 * Packagephobia API からパッケージサイズを取得
 */
export async function fetchPackageSize(
  packageName: string,
): Promise<NpmPackageSize | null> {
  try {
    const res = await fetch(
      `https://packagephobia.com/api.json?p=${packageName}`,
      {
        headers: {
          'User-Agent': 'ciderjs-dashboard/0.1.0',
        },
      },
    );

    if (!res.ok) {
      console.warn(
        `[Packagephobia] Failed to fetch size for ${packageName}: ${res.status}`,
      );
      return null;
    }

    const data: { publishSize: number; installSize: number } = await res.json();
    return {
      publishSize: data.publishSize,
      installSize: data.installSize,
    };
  } catch (err) {
    console.warn(
      `[Packagephobia] Error fetching size for ${packageName}:`,
      err,
    );
    return null;
  }
}

/**
 * パッケージのサマリー情報を一括取得
 */
export async function fetchNpmPackageSummary(
  packageName: string,
): Promise<NpmPackageSummary> {
  const [info, downloads, packageSize] = await Promise.all([
    fetchNpmPackageInfo(packageName),
    fetchNpmDownloads(packageName),
    fetchPackageSize(packageName),
  ]);

  return { info, downloads, packageSize };
}
