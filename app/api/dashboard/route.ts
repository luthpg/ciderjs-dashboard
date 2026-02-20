import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const doc = await db.collection('dashboard').doc('latest').get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    return NextResponse.json(doc.data());
  } catch (error) {
    console.error('[Dashboard Read Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 },
    );
  }
}
