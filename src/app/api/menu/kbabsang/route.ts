import { NextResponse } from 'next/server';

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

// GET: Firebase에 저장된 오늘 자 K밥상 메뉴 조회
export async function GET() {
  if (!FIREBASE_DB_URL) {
    return NextResponse.json({ error: 'Firebase Database URL is not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/kbabsang/today.json`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      throw new Error(`Firebase RTDB responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data || null);
  } catch (error: any) {
    console.error('Failed to get K-Babsang menu from Firebase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 스케줄러를 통해 스크래핑한 오늘 자 K밥상 메뉴 데이터 저장
export async function POST(request: Request) {
  if (!FIREBASE_DB_URL) {
    return NextResponse.json({ error: 'Firebase Database URL is not configured' }, { status: 500 });
  }

  // 1. Cron Secret 검증 (보안)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const { imageUrl, postUrl, lastUpdated } = payload;

    if (!imageUrl || !lastUpdated) {
      return NextResponse.json({ error: 'Missing required fields: imageUrl, lastUpdated' }, { status: 400 });
    }

    // 2. Firebase RTDB에 오늘 자 데이터 기록
    const firebasePayload = {
      imageUrl,
      postUrl: postUrl || '',
      lastUpdated, // Format: YYYY-MM-DD
    };

    const firebaseSecret = process.env.FIREBASE_SECRET;
    const dbUrl = firebaseSecret
      ? `${FIREBASE_DB_URL}/kbabsang/today.json?auth=${firebaseSecret}`
      : `${FIREBASE_DB_URL}/kbabsang/today.json`;

    const res = await fetch(dbUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firebasePayload),
    });

    if (!res.ok) {
      throw new Error(`Failed to write to Firebase. Status: ${res.status}`);
    }

    const savedData = await res.json();
    return NextResponse.json({ success: true, data: savedData });
  } catch (error: any) {
    console.error('Failed to save K-Babsang menu to Firebase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
