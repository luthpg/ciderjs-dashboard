import path from 'node:path';
import util from 'node:util';
import zlib from 'node:zlib';
import { Redis } from '@upstash/redis';
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
 * Proxyを利用したインメモリのPromiseキャッシュラッパー
 * 同一プロセス（バッチ実行中など）での重複リクエストを統合し、1回だけ実行させます。
 */
function withMemoryCache<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  const cache = new Map<string, Promise<any>>();

  return new Proxy(fn, {
    apply(target, thisArg, args) {
      // 引数を元にキャッシュキーを生成（簡易的にJSON.stringifyを使用）
      const key = JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      // キャッシュミス時は元の関数を実行し、そのPromiseをキャッシュ
      const promise = Reflect.apply(target, thisArg, args).catch((err) => {
        // エラー時はキャッシュを破棄して次回の再試行を可能にする
        cache.delete(key);
        throw err;
      });

      cache.set(key, promise);
      return promise;
    },
  });
}

/**
 * npm Registry からパッケージのメタデータを取得
 */
export const fetchNpmPackageInfo = withMemoryCache(
  async (packageName: string): Promise<NpmPackageInfo> => {
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
  },
);

/**
 * npm Registry の downloads API からダウンロード統計を取得
 */
export const fetchNpmDownloads = withMemoryCache(
  async (packageName: string): Promise<NpmDownloadStats> => {
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
  },
);

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

const redis = Redis.fromEnv();

export type RedisValues = Record<
  string,
  {
    version: string;
    size: NpmPackageSize;
  }
>;

/**
 * Rolldown と Terser を使用して独自にバンドルサイズ(ツリーシェイキング込み)を計算する
 * Packagephobia API の代替処理
 */
export async function fetchPackageSize(
  packageName: string,
  version: string,
): Promise<NpmPackageSize | null> {
  try {
    const redisKey = 'npm-packages';
    const cachedValue = await redis.hget<RedisValues[typeof packageName]>(
      redisKey,
      packageName,
    );
    if (cachedValue?.version === version) {
      return cachedValue.size;
    }

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

    const size = {
      publishSize: minified.code.length, // Minify後のサイズ (Bytes)
      installSize: gzipped.byteLength, // Gzip後のサイズ (Bytes)
    };

    await redis.hset<RedisValues[typeof packageName]>(redisKey, {
      [packageName]: {
        version,
        size,
      },
    });

    return size;
  } catch (err) {
    console.warn(`[PackageSize] Error fetching size for ${packageName}:`, err);
    return null;
  }
}

/**
 * パッケージのサマリー情報を一括取得
 */
export async function fetchNpmPackageSummary(
  packageName: string,
): Promise<NpmPackageSummary> {
  const info = await fetchNpmPackageInfo(packageName);

  const [downloads, packageSize] = await Promise.all([
    fetchNpmDownloads(packageName),
    fetchPackageSize(packageName, info.version),
  ]);

  return { info, downloads, packageSize };
}
