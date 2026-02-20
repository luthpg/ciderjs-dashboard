/** npm Registry / Packagephobia 型定義 */

export interface NpmPackageInfo {
  /** パッケージ名 */
  name: string;
  /** 最新バージョン */
  version: string;
  /** 説明 */
  description: string;
  /** 最終更新日 (ISO 8601) */
  lastPublished: string;
  /** npm ページ URL */
  url: string;
}

export interface NpmDownloadStats {
  /** パッケージ名 */
  package: string;
  /** 直近7日間のダウンロード数 */
  weeklyDownloads: number;
  /** 直近30日間のダウンロード数 */
  monthlyDownloads: number;
  /** 日別ダウンロード推移 */
  dailyDownloads: NpmDailyDownload[];
}

export interface NpmDailyDownload {
  /** 日付 (YYYY-MM-DD) */
  day: string;
  /** ダウンロード数 */
  downloads: number;
}

export interface NpmPackageSize {
  /** publish サイズ (bytes) */
  publishSize: number;
  /** install サイズ (bytes) */
  installSize: number;
}

/** fetchNpmPackageSummary() の戻り値 */
export interface NpmPackageSummary {
  info: NpmPackageInfo;
  downloads: NpmDownloadStats;
  packageSize: NpmPackageSize | null;
}
