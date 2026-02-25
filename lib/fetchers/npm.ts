import path from 'node:path';
import util from 'node:util';
import zlib from 'node:zlib';
import { type Plugin, rolldown } from 'rolldown';
import { minify } from 'terser';
import type {
  NpmDailyDownload,
  NpmDownloadStats,
  NpmPackageInfo,
  NpmPackageSize,
  NpmPackageSummary,
} from '@/types/npm';

const gzipAsync = util.promisify(zlib.gzip);

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
 * http-resolve Plugin
 * CDNから直接ESモジュールを解決・取得するRollupプラグイン
 */
function isHttpProtocol(id: string | undefined | null) {
  return id?.startsWith('https://');
}

function httpResolve(): Plugin {
  return {
    name: 'http-resolve',
    async resolveId(id: string, importer: string | undefined) {
      if (isHttpProtocol(id)) {
        return id;
      }
      // ネットワーク上のモジュールからの相対パス解決
      if (importer && isHttpProtocol(importer)) {
        if (id.startsWith('https://')) {
          return id;
        }
        const { pathname, protocol, host } = new URL(importer);
        if (id.startsWith('/')) {
          return `${protocol}//${host}${id}`;
        }
        if (id.startsWith('.') || id === 'entry.js') {
          // 例: ./xxx/yyy
          const resolvedPathname = path.join(path.dirname(pathname), id);
          return `${protocol}//${host}${resolvedPathname}`;
        }
      }
      return null;
    },
    async load(id: string) {
      if (!id || !isHttpProtocol(id)) return null;
      try {
        const res = await fetch(id);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${id}: ${res.statusText}`);
        }
        return await res.text();
      } catch (err) {
        console.error('[http-resolve] fetch error:', err);
        throw err;
      }
    },
  };
}

/**
 * Rolldown と Terser を使用して独自にバンドルサイズ(ツリーシェイキング込み)を計算する
 * Packagephobia API の代替処理
 */
export async function fetchPackageSize(
  packageName: string,
): Promise<NpmPackageSize | null> {
  try {
    // esm.sh をデフォルトのCDNとして使用
    const entryUrl = `https://esm.sh/${packageName}`;

    // パッケージ全体をインポートした際のサイズを計測する仮想エントリーポイント
    const inputCode = `import * as x from "${entryUrl}"; console.log(x);`;

    const bundle = await rolldown({
      input: 'entry.js',
      plugins: [
        {
          name: 'entry',
          resolveId(id, importer) {
            if (importer == null && id === 'entry.js') {
              return 'entry.js';
            }
            return null;
          },
          load(id) {
            if (id === 'entry.js') {
              return inputCode;
            }
            return null;
          },
        },
        httpResolve(),
      ],
      // 外部モジュールの警告などを抑制
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      },
    });

    const generated = await bundle.generate({ format: 'es' });
    const mainCode = generated.output[0].code;

    // TerserによるMinify
    const minified = await minify(mainCode, { module: true });
    if (!minified.code) {
      throw new Error('Minification failed');
    }

    // Gzip圧縮後のサイズを計算
    const gzipped = await gzipAsync(Buffer.from(minified.code));

    return {
      publishSize: minified.code.length, // Minify後のサイズ (Bytes)
      installSize: gzipped.byteLength, // Gzip後のサイズ (Bytes)
    };
  } catch (err) {
    console.warn(
      `[SizeCalculator] Error fetching size for ${packageName}:`,
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
