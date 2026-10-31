import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface VitalReport {
  id: string;
  name: string;
  value: number;
  rating?: string;
  delta?: number;
  navigationType?: string;
  path?: string;
  timestamp: number;
  userAgent?: string;
}

// In-memory sliding buffer of the most recent 500 reports
const MAX_STORED_REPORTS = 500;
const vitalsBuffer: VitalReport[] = [];

// Aggregate metrics tracker
const metricsAggregates: Record<
  string,
  {
    count: number;
    totalValue: number;
    values: number[];
    ratings: { good: number; 'needs-improvement': number; poor: number };
  }
> = {
  CLS: { count: 0, totalValue: 0, values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } },
  LCP: { count: 0, totalValue: 0, values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } },
  INP: { count: 0, totalValue: 0, values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } },
  FCP: { count: 0, totalValue: 0, values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } },
  TTFB: { count: 0, totalValue: 0, values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } },
};

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, index)] * 100) / 100;
}

export async function POST(req: NextRequest) {
  try {
    let data: Partial<VitalReport>;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await req.json();
    } else {
      const text = await req.text();
      try {
        data = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { error: 'Invalid payload' },
          {
            status: 400,
            headers: { 'Cache-Control': 'private, no-store, max-age=0' },
          }
        );
      }
    }

    if (!data || !data.name || typeof data.value !== 'number') {
      return NextResponse.json(
        { error: 'Missing required metric fields (name, value)' },
        {
          status: 400,
          headers: { 'Cache-Control': 'private, no-store, max-age=0' },
        }
      );
    }

    const metricName = String(data.name).toUpperCase();
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const report: VitalReport = {
      id: String(data.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      name: metricName,
      value: data.value,
      rating: data.rating || (data.value <= 0 ? 'good' : 'good'),
      delta: data.delta,
      navigationType: data.navigationType,
      path: data.path || '/',
      timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
      userAgent: userAgent.slice(0, 150),
    };

    // Store in circular buffer
    vitalsBuffer.unshift(report);
    if (vitalsBuffer.length > MAX_STORED_REPORTS) {
      vitalsBuffer.pop();
    }

    // Update aggregate metrics if known
    if (metricsAggregates[metricName]) {
      const agg = metricsAggregates[metricName];
      agg.count += 1;
      agg.totalValue += report.value;
      agg.values.push(report.value);
      if (agg.values.length > 200) {
        agg.values.shift();
      }

      const ratingKey = (report.rating || 'good') as 'good' | 'needs-improvement' | 'poor';
      if (agg.ratings[ratingKey] !== undefined) {
        agg.ratings[ratingKey] += 1;
      }
    }

    return NextResponse.json(
      { ok: true, metric: metricName, id: report.id },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to record vitals metric' },
      {
        status: 500,
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      }
    );
  }
}

export async function GET() {
  const summary: Record<string, any> = {};

  for (const [key, agg] of Object.entries(metricsAggregates)) {
    const avg = agg.count > 0 ? Math.round((agg.totalValue / agg.count) * 100) / 100 : 0;
    const p75 = calculatePercentile(agg.values, 75);
    const p90 = calculatePercentile(agg.values, 90);

    summary[key] = {
      count: agg.count,
      average: avg,
      p75,
      p90,
      ratings: agg.ratings,
    };
  }

  // Detect recent bottlenecks (poor rating or high thresholds)
  const bottlenecks = vitalsBuffer
    .filter(
      (m) =>
        m.rating === 'poor' ||
        (m.name === 'LCP' && m.value > 2500) ||
        (m.name === 'CLS' && m.value > 0.1) ||
        (m.name === 'INP' && m.value > 200)
    )
    .slice(0, 20);

  return NextResponse.json(
    {
      status: 'operational',
      totalReports: vitalsBuffer.length,
      summary,
      recentBottlenecks: bottlenecks,
      recentSamples: vitalsBuffer.slice(0, 25),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    }
  );
}
