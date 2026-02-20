import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { fetchGithubRepos } from '@/lib/fetchers/github';

const GITHUB_OWNER = env.NEXT_PUBLIC_USER_NAME;

export async function GET() {
  try {
    const overview = await fetchGithubRepos(GITHUB_OWNER);

    return NextResponse.json(overview);
  } catch (err) {
    console.error('[API] GitHub fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub data' },
      { status: 500 },
    );
  }
}
