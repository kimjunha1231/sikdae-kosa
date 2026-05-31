import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const FIREBASE_SECRET = process.env.FIREBASE_SECRET;

export async function GET(request: Request) {
  // 1. Cron Secret 검증 (보안)
  // Vercel Cron은 자동으로 Authorization: Bearer <CRON_SECRET> 헤더를 전송합니다.
  const authHeader = request.headers.get('authorization');
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. 환경 변수 검증
  if (!FIREBASE_DB_URL) {
    return NextResponse.json({ error: 'Firebase Database URL is not configured' }, { status: 500 });
  }
  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'RAPIDAPI_KEY is not configured' }, { status: 500 });
  }

  try {
    console.log('Starting K-Babsang menu scraping via RapidAPI Instagram Scraper...');

    const userId = '23044319852'; // kbabsang_official's permanent numeric user ID
    const apiEndpoint = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/feed?user_id=${userId}`;

    console.log('Fetching profile feed from RapidAPI...');
    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 } // Vercel 캐시 무효화
    });

    if (!response.ok) {
      throw new Error(`RapidAPI responded with status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.items;

    if (!items || items.length === 0) {
      throw new Error('No posts found in profile feed.');
    }

    // Extract first (latest) post
    const firstPost = items[0];
    const caption = firstPost.caption?.text || firstPost.caption_text || (typeof firstPost.caption === 'string' ? firstPost.caption : '');
    const imageUrl = firstPost.image_versions2?.candidates?.[0]?.url || firstPost.thumbnail_url || firstPost.display_url || '';
    const code = firstPost.code || firstPost.shortcode || '';
    const postUrl = code ? `https://www.instagram.com/p/${code}/` : (firstPost.link || firstPost.url || '');

    console.log('=== Scraped Data ===');
    console.log('Post URL:', postUrl);
    console.log('Image URL:', imageUrl ? imageUrl.substring(0, 120) + '...' : 'None');
    console.log('Caption snippet:', caption.substring(0, 150) + '...');
    console.log('====================');

    if (!imageUrl) {
      throw new Error('Image URL was not found in the first post.');
    }

    // Check if the post is for today (KST)
    const d = new Date();
    // KST is UTC+9
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const month = kst.getMonth() + 1;
    const date = kst.getDate();

    const datePatterns = [
      `${month}월\\s*${date}일`,
      `${month}/${date}`,
      `0${month}\\.0${date}`,
      `0${month}\\.${date}`,
      `${month}\\.0${date}`,
      `${month}\\.${date}`,
    ];

    let isTodayPost = false;
    for (const pattern of datePatterns) {
      const regex = new RegExp(pattern);
      if (regex.test(caption)) {
        isTodayPost = true;
        console.log(`Matched date pattern in caption: "${pattern}"`);
        break;
      }
    }

    // 로컬 디버깅 및 수동 테스트를 위한 force 쿼리 검사
    const { searchParams } = new URL(request.url);
    const isForced = searchParams.get('force') === 'true' || process.env.FORCED_UPDATE === 'true';

    if (!isTodayPost && !isForced) {
      console.log(`Today's date (${month}/${date}) was not found in the post caption. Assuming this post is older. Skipping Firebase update.`);
      return NextResponse.json({ 
        success: true, 
        message: `Skipped: Post date does not match today's date (${month}/${date}).`,
        scrapedData: { postUrl, captionSnippet: caption.substring(0, 100) }
      });
    }

    // 4. Firebase RTDB에 오늘 자 데이터 기록
    const firebasePayload = {
      imageUrl,
      postUrl,
      lastUpdated: kst.toISOString().split('T')[0], // Format: YYYY-MM-DD
    };

    const dbUrl = FIREBASE_SECRET
      ? `${FIREBASE_DB_URL}/kbabsang/today.json?auth=${FIREBASE_SECRET}`
      : `${FIREBASE_DB_URL}/kbabsang/today.json`;

    console.log('Sending update to Firebase...');
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
    console.log('Successfully updated K-Babsang menu!');
    return NextResponse.json({ success: true, message: 'Successfully updated K-Babsang menu!', data: savedData });

  } catch (error: any) {
    console.error('Failed to execute scraping:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
