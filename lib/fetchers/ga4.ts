import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { env } from '@/lib/env';
import type {
  Ga4PageStats,
  Ga4SiteSummary,
  Ga4TrafficSource,
} from '@/types/ga4';

function getClient() {
  const key = env.GA4_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error('GA4_SERVICE_ACCOUNT_KEY is not set');
  }
  return new BetaAnalyticsDataClient({
    credentials: JSON.parse(key),
  });
}

function getPropertyId() {
  const id = env.GA4_PROPERTY_ID;
  if (!id) {
    throw new Error('GA4_PROPERTY_ID is not set');
  }
  return id;
}

/**
 * ページパス別の PV・ユーザー数を取得 (直近30日)
 */
export async function getWebsiteStats(): Promise<Ga4PageStats[]> {
  const client = getClient();
  const propertyId = getPropertyId();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 50,
  });

  return (
    response.rows?.map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? '',
      views: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    })) ?? []
  );
}

/**
 * 流入元チャネル別のセッション・ユーザー数を取得 (直近30日)
 */
export async function getTrafficSources(): Promise<Ga4TrafficSource[]> {
  const client = getClient();
  const propertyId = getPropertyId();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });

  return (
    response.rows?.map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? '',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    })) ?? []
  );
}

/**
 * サイト全体のサマリー (直近30日)
 */
export async function getSiteSummary(): Promise<Ga4SiteSummary> {
  const client = getClient();
  const propertyId = getPropertyId();

  const startDate = '30daysAgo';
  const endDate = 'today';

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'screenPageViews' },
    ],
  });

  const row = response.rows?.[0];
  return {
    totalSessions: Number(row?.metricValues?.[0]?.value ?? 0),
    totalUsers: Number(row?.metricValues?.[1]?.value ?? 0),
    totalPageViews: Number(row?.metricValues?.[2]?.value ?? 0),
    startDate,
    endDate,
  };
}
