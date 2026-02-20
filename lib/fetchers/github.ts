import type { GithubOverview, GithubRepoStats } from '@/types/github';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is not set');
  }
  return token;
}

interface GraphQLRepoNode {
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  issues: { totalCount: number };
  primaryLanguage: { name: string } | null;
  updatedAt: string;
  isFork: boolean;
  isArchived: boolean;
}

interface GraphQLResponse {
  data: {
    user: {
      repositories: {
        nodes: GraphQLRepoNode[];
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    };
  };
}

const REPOS_QUERY = `
query ($owner: String!, $after: String) {
  user(login: $owner) {
    repositories(
      first: 100
      after: $after
      ownerAffiliations: OWNER
      orderBy: { field: STARGAZERS, direction: DESC }
    ) {
      nodes {
        name
        nameWithOwner
        description
        url
        stargazerCount
        forkCount
        issues(states: OPEN) { totalCount }
        primaryLanguage { name }
        updatedAt
        isFork
        isArchived
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`;

/**
 * GitHub GraphQL API で指定ユーザーの全リポジトリ統計を取得
 */
export async function fetchGithubRepos(owner: string): Promise<GithubOverview> {
  const token = getToken();
  const allRepos: GithubRepoStats[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: REPOS_QUERY,
        variables: { owner, after },
      }),
    });

    if (!res.ok) {
      throw new Error(
        `[GitHub] GraphQL request failed: ${res.status} ${res.statusText}`,
      );
    }

    const json: GraphQLResponse = await res.json();
    const { nodes, pageInfo } = json.data.user.repositories;

    for (const node of nodes) {
      allRepos.push({
        name: node.name,
        nameWithOwner: node.nameWithOwner,
        description: node.description,
        url: node.url,
        stargazerCount: node.stargazerCount,
        forkCount: node.forkCount,
        openIssueCount: node.issues.totalCount,
        primaryLanguage: node.primaryLanguage?.name ?? null,
        updatedAt: node.updatedAt,
        isFork: node.isFork,
        isArchived: node.isArchived,
      });
    }

    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;
  }

  const totalStars = allRepos.reduce((sum, r) => sum + r.stargazerCount, 0);
  const totalForks = allRepos.reduce((sum, r) => sum + r.forkCount, 0);

  return {
    owner,
    totalStars,
    totalForks,
    repositories: allRepos,
  };
}
