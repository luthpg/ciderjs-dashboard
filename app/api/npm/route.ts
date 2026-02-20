import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { fetchNpmPackageSummary } from '@/lib/fetchers/npm';

/** デフォルトで取得する自分のパッケージ一覧 */
const DEFAULT_PACKAGES = env.NEXT_PUBLIC_OSS_PACKAGES.split(',');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packagesParam = searchParams.get('packages');

    const packageNames = packagesParam
      ? packagesParam.split(',').map((p) => p.trim())
      : DEFAULT_PACKAGES;

    const results = await Promise.all(
      packageNames.map((pkg) => fetchNpmPackageSummary(pkg)),
    );

    return NextResponse.json({
      packages: results,
    });
  } catch (err) {
    console.error('[API] npm fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch npm data' },
      { status: 500 },
    );
  }
}
