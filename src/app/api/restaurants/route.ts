import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { Restaurant, Review } from '@/entities/restaurant';

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'restaurants.json');

// 전역 캐시 변수 선언
let cachedRawRestaurants: Restaurant[] | null = null;

async function readData(): Promise<Restaurant[]> {
  if (cachedRawRestaurants) {
    return JSON.parse(JSON.stringify(cachedRawRestaurants));
  }
  try {
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    cachedRawRestaurants = JSON.parse(data);
    return JSON.parse(JSON.stringify(cachedRawRestaurants));
  } catch (e) {
    console.error('Failed to read data file', e);
    return [];
  }
}

async function writeData(data: Restaurant[]) {
  try {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    // 캐시 최신화
    cachedRawRestaurants = JSON.parse(JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to write data file', e);
    return false;
  }
}

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

function getKSTDateString() {
  const d = new Date();
  // KST is UTC+9
  const kst = new Date(d.getTime() + (9 * 60 * 60 * 1000));
  return kst.toISOString().split('T')[0];
}

export async function GET() {
  const restaurants = await readData();
  
  if (!FIREBASE_DB_URL) {
    return NextResponse.json(restaurants);
  }

  // 1. Firebase로부터 오늘 자 K밥상 데이터와 전체 리뷰 데이터 병합 시도
  let reviews: Record<string, Record<string, Review>> = {};
  let kBabsangData: any = null;

  try {
    const [kbabsangRes, reviewsRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/kbabsang/today.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2000),
      }).catch((err) => {
        console.error('Failed to fetch K-Babsang menu from Firebase:', err);
        return null;
      }),
      fetch(`${FIREBASE_DB_URL}/reviews.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2000),
      }).catch((err) => {
        console.error('Failed to fetch reviews from Firebase:', err);
        return null;
      })
    ]);

    if (kbabsangRes && kbabsangRes.ok) {
      kBabsangData = await kbabsangRes.json();
    }
    if (reviewsRes && reviewsRes.ok) {
      reviews = await reviewsRes.json() || {};
    }
  } catch (error) {
    console.error('Failed to load Firebase data:', error);
  }

  // 2. K밥상 데이터 병합 처리
  if (kBabsangData) {
    const todayStr = getKSTDateString();
    if (kBabsangData.lastUpdated === todayStr && kBabsangData.imageUrl) {
      const kIndex = restaurants.findIndex((r) => r.name === 'K밥상');
      if (kIndex !== -1) {
        restaurants[kIndex] = {
          ...restaurants[kIndex],
          image_url: kBabsangData.imageUrl,
          menus: [
            {
              name: '오늘의 한식뷔페 (인스타 식단표)',
              price: 10000,
              imageUrl: kBabsangData.imageUrl,
            }
          ],
          instagram_link: kBabsangData.postUrl || null,
        };
      }
    }
  }

  // 3. 각 식당에 실시간 리뷰 평점과 개수 매핑 처리
  const restaurantsWithRatings = restaurants.map((r: Restaurant) => {
    const resReviews = reviews[r.id || ''] || {};
    const reviewsArray = Object.values(resReviews);
    if (reviewsArray.length > 0) {
      const sum = reviewsArray.reduce((acc: number, curr: Review) => acc + (curr.rating || 0), 0);
      const avg = (sum / reviewsArray.length).toFixed(2);
      return {
        ...r,
        rating: avg,
        reviewCount: reviewsArray.length
      };
    }
    return {
      ...r,
      rating: r.rating && r.rating !== '0' ? r.rating : '0',
      reviewCount: r.reviewCount || 0
    };
  });

  return NextResponse.json(restaurantsWithRatings);
}

export async function POST(request: Request) {
  try {
    const newRestaurant = await request.json();
    const restaurants = await readData();
    
    // Generate simple ID if not present
    if (!newRestaurant.id) {
      newRestaurant.id = Date.now().toString();
    }
    
    restaurants.unshift(newRestaurant);
    
    const success = await writeData(restaurants);
    if (success) {
      return NextResponse.json({ success: true, data: newRestaurant });
    }
    return NextResponse.json({ error: 'Failed to write database' }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedRestaurant = await request.json();
    const restaurants = await readData();
    
    // We match by unique name and distance or dynamic id
    const index = restaurants.findIndex((r: any) => 
      (updatedRestaurant.id && r.id === updatedRestaurant.id) || 
      (!updatedRestaurant.id && r.name === updatedRestaurant.name && r.distance === updatedRestaurant.distance)
    );
    
    if (index !== -1) {
      restaurants[index] = { ...restaurants[index], ...updatedRestaurant };
      const success = await writeData(restaurants);
      if (success) {
        return NextResponse.json({ success: true, data: restaurants[index] });
      }
      return NextResponse.json({ error: 'Failed to save database' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name, distance, id } = await request.json();
    const restaurants = await readData();
    
    const initialLength = restaurants.length;
    const filtered = restaurants.filter((r: any) => 
      !((id && r.id === id) || (!id && r.name === name && r.distance === distance))
    );
    
    if (filtered.length < initialLength) {
      const success = await writeData(filtered);
      if (success) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Failed to write database' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
